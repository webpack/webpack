"use strict";

const path = require("path");
const NodeWatchFileSystem = require("../../lib/node/NodeWatchFileSystem");

const fixtures = path.join(__dirname, "../fixtures");
const file = path.join(fixtures, "a.js");

/** @type {{ close: () => void }[]} */
let watchers;

/**
 * Starts a watcher over the same file with the given options.
 * @param {import("../../lib/fs/fs").WatchOptions} options watch options
 * @returns {InstanceType<import("watchpack")>} the watchpack instance behind it
 */
const watch = (options) => {
	const wfs = new NodeWatchFileSystem(
		/** @type {import("../../lib/fs/fs").InputFileSystem} */ ({})
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

	// The pool is keyed by value, so the entry must not stay attached to the
	// caller's object. Values are unique to this case: the map is module state.
	it("does not hand a later caller options mutated by an earlier one", () => {
		const mutated = { aggregateTimeout: 4321, ignored: ["**/mutated"] };
		watch(mutated);
		mutated.aggregateTimeout = 5000;
		mutated.ignored[0] = "**/other";

		const later = watch({ aggregateTimeout: 4321, ignored: ["**/mutated"] });

		expect(later.aggregateTimeout).toBe(4321);
		expect(later.options.ignored).toEqual(["**/mutated"]);
	});

	it("purges what a later call stops watching", () => {
		/** @type {Parameters<import("../../lib/fs/fs").Purge>[]} */
		const purges = [];
		const wfs = new NodeWatchFileSystem(
			/** @type {import("../../lib/fs/fs").InputFileSystem} */ ({
				purge: (items, options) => {
					purges.push([items, options]);
				}
			})
		);
		const [kept, moved, dropped, directory, missing] = [
			"a.js",
			"b.js",
			"c.js",
			"directory",
			"missing.js"
		].map((name) => path.join(fixtures, name));
		const start = (
			/** @type {string[]} */ files,
			/** @type {string[]} */ directories,
			/** @type {string[]} */ missingFiles
		) =>
			watchers.push(
				wfs.watch(
					files,
					directories,
					missingFiles,
					Date.now(),
					{},
					() => {},
					() => {}
				)
			);
		start([kept, moved, dropped], [directory], [missing]);
		expect(purges).toEqual([]);
		start([kept], [], [moved]);
		expect(purges).toEqual([[[dropped, directory, missing], { exact: true }]]);
		start([kept], [], [moved]);
		expect(purges).toHaveLength(1);
	});

	it("purges what an array held when watched, though its caller changes it", () => {
		/** @type {Parameters<import("../../lib/fs/fs").Purge>[]} */
		const purges = [];
		const wfs = new NodeWatchFileSystem(
			/** @type {import("../../lib/fs/fs").InputFileSystem} */ ({
				purge: (items, options) => {
					purges.push([items, options]);
				}
			})
		);
		const dropped = path.join(fixtures, "c.js");
		const files = [file, dropped];
		watchers.push(
			wfs.watch(
				files,
				[],
				[],
				Date.now(),
				{},
				() => {},
				() => {}
			)
		);
		files.pop();
		watchers.push(
			wfs.watch(
				[file],
				[],
				[],
				Date.now(),
				{},
				() => {},
				() => {}
			)
		);
		expect(purges).toEqual([[[dropped], { exact: true }]]);
	});

	it("hands watchpack a one-shot iterable it read itself", () => {
		const wfs = new NodeWatchFileSystem(
			/** @type {import("../../lib/fs/fs").InputFileSystem} */ ({
				purge: () => {}
			})
		);
		const start = (
			/** @type {Iterable<string>} */ files,
			/** @type {Iterable<string>} */ missing
		) =>
			watchers.push(
				wfs.watch(
					files,
					[],
					missing,
					Date.now(),
					{},
					() => {},
					() => {}
				)
			);
		start([file], []);
		// the second call compares against the first, reading these once
		start([file].values(), [].values());
		const watcher =
			/** @type {InstanceType<import("watchpack")>} */
			(wfs.watcher);
		expect([...watcher.fileWatchers.keys()]).toEqual([file]);
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
