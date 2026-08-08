"use strict";

const path = require("path");
const NodeWatchFileSystem = require("../lib/node/NodeWatchFileSystem");

const fixtures = path.join(__dirname, "fixtures");
const file = path.join(fixtures, "a.js");

/** @type {{ close: () => void }[]} */
let watchers;

/**
 * Starts a watcher over the same file with the given options.
 * @param {import("../lib/util/fs").WatchOptions} options watch options
 * @returns {InstanceType<import("watchpack")>} the watchpack instance behind it
 */
const watch = (options) => {
	const wfs = new NodeWatchFileSystem(
		/** @type {import("../lib/util/fs").InputFileSystem} */ ({})
	);
	watchers.push(
		wfs.watch(
			[file],
			[],
			[],
			Date.now(),
			options,
			() => {},
			() => {}
		)
	);
	return /** @type {InstanceType<import("watchpack")>} */ (wfs.watcher);
};

describe("NodeWatchFileSystem", () => {
	beforeEach(() => {
		watchers = [];
	});

	afterEach(() => {
		for (const watcher of watchers) watcher.close();
	});

	// Sharing the pool is what keeps a MultiCompiler from scanning every watched
	// directory once per child.
	it("shares one watcher pool between equal options", () => {
		const a = watch({ aggregateTimeout: 20 });
		const b = watch({ aggregateTimeout: 20 });

		expect(b.watcherManager).toBe(a.watcherManager);
		expect(a.watcherManager.directoryWatchers.size).toBe(1);
	});

	it("keeps separate pools for different aggregateTimeout", () => {
		const a = watch({ aggregateTimeout: 20 });
		const b = watch({ aggregateTimeout: 300 });

		expect(b.watcherManager).not.toBe(a.watcherManager);
	});

	it("keeps separate pools for different ignored patterns", () => {
		const a = watch({ aggregateTimeout: 20, ignored: "**/a" });
		const b = watch({ aggregateTimeout: 20, ignored: "**/b" });
		const c = watch({ aggregateTimeout: 20, ignored: ["**/a"] });

		expect(b.watcherManager).not.toBe(a.watcherManager);
		expect(c.watcherManager).not.toBe(a.watcherManager);
	});

	it("shares equal ignored patterns given as arrays", () => {
		const a = watch({ aggregateTimeout: 20, ignored: ["**/a", "**/b"] });
		const b = watch({ aggregateTimeout: 20, ignored: ["**/a", "**/b"] });

		expect(b.watcherManager).toBe(a.watcherManager);
	});

	it("keeps separate pools for different poll and followSymlinks", () => {
		const a = watch({ aggregateTimeout: 20 });
		const b = watch({ aggregateTimeout: 20, poll: 100 });
		const c = watch({ aggregateTimeout: 20, followSymlinks: true });

		expect(b.watcherManager).not.toBe(a.watcherManager);
		expect(c.watcherManager).not.toBe(a.watcherManager);
	});

	// A RegExp can only be compared by reference, never by value.
	it("shares an ignored RegExp only when it is the same reference", () => {
		const ignored = /node_modules/;
		const a = watch({ aggregateTimeout: 20, ignored });
		const b = watch({ aggregateTimeout: 20, ignored });
		const c = watch({ aggregateTimeout: 20, ignored: /node_modules/ });

		expect(b.watcherManager).toBe(a.watcherManager);
		expect(c.watcherManager).not.toBe(a.watcherManager);
	});

	it("leaves an unsupported ignored option to watchpack", () => {
		expect(() =>
			watch({
				aggregateTimeout: 20,
				ignored: /** @type {EXPECTED_ANY} */ (42)
			})
		).toThrow("Invalid option for 'ignored'");
	});
});
