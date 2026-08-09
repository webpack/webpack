"use strict";

const path = require("path");
const { CachedInputFileSystem } = require("enhanced-resolve");
const fs = require("graceful-fs");
const { Volume, createFsFromVolume } = require("memfs");

const webpack = require("..");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

expectNoDeprecations();

/** @typedef {import("../").Compiler} Compiler */
/** @typedef {import("../").InputFileSystem} InputFileSystem */
/** @typedef {import("memfs").IFs} IFs */

describe("WatchInputFileSystem", () => {
	const fixturePath = path.join(__dirname, "fixtures", "temp-watch-input-fs");
	const filePath = path.join(fixturePath, "file.js");

	beforeEach(() => {
		fs.mkdirSync(fixturePath, { recursive: true });
		fs.writeFileSync(filePath, "module.exports = 'original';", "utf8");
	});

	afterEach((done) => {
		setTimeout(() => {
			fs.rmSync(fixturePath, { recursive: true, force: true });
			done();
		}, 100); // cool down a bit
	});

	if (process.env.NO_WATCH_TESTS) {
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip("long running tests excluded", () => {});

		return;
	}

	/**
	 * @param {Compiler} compiler compiler whose output is read back
	 * @returns {IFs} the memory filesystem it writes to
	 */
	const useMemoryOutput = (compiler) => {
		const memfs = createFsFromVolume(new Volume());
		compiler.outputFileSystem =
			/** @type {import("../").OutputFileSystem} */
			(/** @type {unknown} */ (memfs));
		return /** @type {IFs} */ (/** @type {unknown} */ (memfs));
	};

	/** @type {import("../").Configuration} */
	const config = {
		mode: "development",
		entry: filePath,
		output: { path: "/directory", filename: "bundle.js" }
	};

	const watchOptions = {
		aggregateTimeout: 50,
		// Deno's node:fs.watch compat drops change events; poll for a
		// deterministic pickup.
		...(process.versions.deno ? { poll: 100 } : {})
	};

	/** @typedef {{ close: (callback: () => void) => void }} Closable */

	/**
	 * The filesystem NodeEnvironmentPlugin builds, made again by hand.
	 * @returns {InputFileSystem} a fresh cached input filesystem
	 */
	const createInputFileSystem = () =>
		/** @type {InputFileSystem} */
		(
			/** @type {unknown} */
			(
				new CachedInputFileSystem(
					/** @type {ConstructorParameters<typeof CachedInputFileSystem>[0]} */
					(/** @type {unknown} */ (fs)),
					60000
				)
			)
		);

	/**
	 * The handler runs before `Watching` re-arms its watcher a tick later, so
	 * writing right away races the change against nothing watching for it.
	 * @param {Compiler[]} compilers compilers that must be watching
	 * @param {() => void} callback called once every one of them is
	 * @returns {void}
	 */
	const whenWatcherReady = (compilers, callback) => {
		if (
			compilers.every(
				(compiler) => compiler.watching && compiler.watching.watcher
			)
		) {
			callback();
			return;
		}
		setTimeout(() => whenWatcherReady(compilers, callback), 10);
	};

	/**
	 * Drives one watch cycle: build, rewrite the entry, build again.
	 * @param {Compiler[]} compilers compilers under test
	 * @param {() => Closable} getWatching the watcher, read once it exists
	 * @param {() => boolean} sawChange whether every bundle carries the new source
	 * @param {(err?: Error) => void} done jest callback
	 * @returns {(err: Error | null) => void} the watch handler
	 */
	const expectRebuildToSeeTheChange = (
		compilers,
		getWatching,
		sawChange,
		done
	) => {
		let builds = 0;

		return (err) => {
			if (err) return done(err);
			builds++;
			if (builds === 1) {
				whenWatcherReady(compilers, () => {
					fs.writeFile(
						filePath,
						"module.exports = 'changed';",
						"utf8",
						(err2) => {
							if (err2) done(err2);
						}
					);
				});
				return;
			}
			if (builds > 2) return;
			/** @type {Error | undefined} */
			let error;
			try {
				expect(sawChange()).toBe(true);
			} catch (err2) {
				error = /** @type {Error} */ (err2);
			}
			getWatching().close(() => done(error));
		};
	};

	// Replacing `inputFileSystem` used to leave the watcher purging the
	// filesystem it captured at construction, so watch served stale sources.
	it("rebuilds from a replaced inputFileSystem", (done) => {
		const compiler = /** @type {Compiler} */ (webpack(config));
		const memfs = useMemoryOutput(compiler);

		compiler.inputFileSystem = createInputFileSystem();

		const watching = compiler.watch(
			watchOptions,
			expectRebuildToSeeTheChange(
				[compiler],
				() => /** @type {Closable} */ (watching),
				() =>
					memfs
						.readFileSync("/directory/bundle.js")
						.toString()
						.includes("changed"),
				done
			)
		);
	});

	it("rebuilds every child from a replaced inputFileSystem", (done) => {
		const compiler = /** @type {import("../").MultiCompiler} */ (
			webpack([
				{ ...config, name: "a" },
				{ ...config, name: "b" }
			])
		);
		const filesystems = compiler.compilers.map((child) =>
			useMemoryOutput(child)
		);

		// The MultiCompiler setter hands one filesystem to every child.
		compiler.inputFileSystem = createInputFileSystem();

		const watching = compiler.watch(
			watchOptions,
			expectRebuildToSeeTheChange(
				compiler.compilers,
				() => /** @type {Closable} */ (watching),
				() =>
					filesystems.every((memfs) =>
						memfs
							.readFileSync("/directory/bundle.js")
							.toString()
							.includes("changed")
					),
				done
			)
		);
	});
});
