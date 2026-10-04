"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const rimraf = require("rimraf");
const webpack = require("../..");
const compareWatchCompilation = require("./compareWatchCompilation");

/** @import { Compiler, Configuration, Stats, Watching } from "../../" */
/** @import { WatcherInfo } from "../../lib/fs/fs" */
/** @typedef {{ directory: string, experiments?: Configuration["experiments"] }} ScenarioOptions */
/** @typedef {Record<string, string | null>} FileChanges */
/**
 * @typedef {object} WatchTestSession
 * @property {Compiler} compiler compiler under test
 * @property {(changes: FileChanges) => void} write apply file edits before notifying watch
 * @property {() => Promise<Stats>} start start watching and await the initial build
 * @property {() => Promise<Stats>} nextBuild await the next delivered build
 * @property {() => Promise<void>} invalidate request a rebuild and await its callback
 * @property {(stats: Stats) => Promise<void>} compare compare with a fresh build
 * @property {() => unknown} readExports execute the emitted entry in an isolated context
 * @property {() => Promise<void>} close close the compiler and its watcher
 */

/**
 * Drives real watch compilations with explicit filesystem notifications.
 * @param {string} directory isolated fixture directory
 * @param {Configuration} configuration compiler configuration
 * @param {Parameters<typeof compareWatchCompilation>[3]} comparison justified comparison exceptions
 * @returns {WatchTestSession} watch session
 */
const createWatchTestSession = (directory, configuration, comparison = {}) => {
	rimraf.sync(directory);
	const sourceDirectory = path.join(directory, "src");
	const outputDirectory = path.join(directory, "dist");
	fs.mkdirSync(sourceDirectory, { recursive: true });
	/** @type {Configuration} */
	const options = {
		mode: "development",
		target: "node",
		devtool: false,
		context: sourceDirectory,
		entry: "./index.js",
		...configuration,
		output: {
			filename: "bundle.js",
			library: { type: "commonjs2" },
			...configuration.output,
			path: outputDirectory
		}
	};
	if (
		typeof options.cache === "object" &&
		options.cache.type === "filesystem"
	) {
		options.cache = {
			...options.cache,
			cacheDirectory: path.join(directory, "cache")
		};
	}
	const compiler = webpack(options);
	const freshDirectory = path.join(directory, "fresh");
	const compare = compareWatchCompilation(
		compiler,
		options,
		freshDirectory,
		comparison
	);
	/** @type {Watching | undefined} */
	let watching;
	/** @type {Stats | undefined} */
	let result;
	/** @type {((error: Error | null, stats?: Stats) => void) | undefined} */
	let complete;
	let revision = 0;
	/** @type {Set<string>} */
	let changes = new Set();
	/** @type {Set<string>} */
	let removals = new Set();

	/** @returns {WatcherInfo} pending filesystem changes */
	const getInfo = () => {
		const info = {
			changes,
			removals,
			fileTimeInfoEntries: new Map(),
			contextTimeInfoEntries: new Map()
		};
		changes = new Set();
		removals = new Set();
		return info;
	};
	compiler.watchFileSystem = {
		watch() {
			// Watching registers the next watcher after storing dependencies and
			// releasing compilation data; advance the test only after that point.
			process.nextTick(() => {
				if (complete && result) complete(null, result);
			});
			return {
				close() {},
				pause() {},
				getInfo,
				getFileTimeInfoEntries: () => new Map(),
				getContextTimeInfoEntries: () => new Map()
			};
		}
	};

	/** @returns {Promise<Stats>} next completed watch build */
	const nextBuild = () =>
		new Promise((resolve, reject) => {
			assert(!complete, "A watch build is already being awaited");
			result = undefined;
			const timeout = setTimeout(() => {
				complete = undefined;
				reject(new Error("Timed out waiting for a watch build"));
			}, 10000);
			complete = (error, stats) => {
				clearTimeout(timeout);
				complete = undefined;
				if (error) {
					reject(error);
				} else {
					assert(stats);
					resolve(stats);
				}
			};
		});

	/**
	 * @param {string} output output directory
	 * @returns {unknown} isolated entry exports
	 */
	const readExports = (output) => {
		const module = { exports: {} };
		vm.runInNewContext(
			fs.readFileSync(path.join(output, "bundle.js"), "utf8"),
			{ module, exports: module.exports }
		);
		return JSON.parse(JSON.stringify(module.exports));
	};

	return {
		compiler,
		write(files) {
			revision++;
			for (const [name, content] of Object.entries(files)) {
				const filename = path.join(sourceDirectory, name);
				if (content === null) {
					if (fs.existsSync(filename)) fs.unlinkSync(filename);
					changes.delete(filename);
					removals.add(filename);
				} else {
					fs.mkdirSync(path.dirname(filename), { recursive: true });
					fs.writeFileSync(filename, content);
					// Distinct, past timestamps also work on filesystems with coarse clocks.
					const timestamp = new Date(Date.UTC(2000, 0, 1) + revision * 1000);
					fs.utimesSync(filename, timestamp, timestamp);
					removals.delete(filename);
					changes.add(filename);
				}
			}
			if (compiler.inputFileSystem && compiler.inputFileSystem.purge) {
				compiler.inputFileSystem.purge();
			}
		},
		start() {
			getInfo();
			const next = nextBuild();
			watching = compiler.watch({}, (error, stats) => {
				if (error) {
					assert(complete);
					complete(error);
				} else {
					result = stats;
				}
			});
			return next;
		},
		nextBuild,
		invalidate() {
			assert(watching);
			const watcher = watching;
			return new Promise((resolve, reject) => {
				watcher.invalidate((error) => (error ? reject(error) : resolve()));
			});
		},
		async compare(stats) {
			await compare(stats);
			if (!comparison.skipFreshCompilation && !stats.hasErrors()) {
				expect(readExports(outputDirectory)).toEqual(
					readExports(path.join(freshDirectory, "0"))
				);
			}
		},
		readExports() {
			return readExports(outputDirectory);
		},
		close() {
			return new Promise((resolve, reject) => {
				compiler.close((error) => (error ? reject(error) : resolve()));
			});
		}
	};
};

module.exports = createWatchTestSession;
