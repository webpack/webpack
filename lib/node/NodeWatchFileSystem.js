/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const memoize = require("../util/memoize");

// watchpack is only reachable from `watch`, so non-watch builds never load it
const getWatchpack = memoize(() => require("watchpack"));

/** @typedef {InstanceType<import("watchpack")>} Watchpack */
/** @import { TimeInfoEntries, WatchOptions } from "watchpack" */
/**
 * @import {
 * 	InputFileSystem,
 * 	WatchMethod,
 * 	Changes,
 * 	Removals
 * } from "../util/fs"
 */

// Watchpack pools DirectoryWatchers per options object identity; interning by
// value lets a MultiCompiler's children share one pool instead of one scan each.
/** @type {Map<string, WatchOptions>} */
const canonicalWatchOptions = new Map();
/** @type {WeakMap<RegExp, string>} */
const regExpKeys = new WeakMap();
let nextRegExpKey = 0;

// A RegExp keys by reference, so two configs spelling the same one inline do
// not share a pool.
/**
 * @param {WatchOptions["ignored"]} ignored the `ignored` option
 * @returns {string} key describing it, or "" when it cannot be keyed
 */
const ignoredKey = (ignored) => {
	if (ignored === undefined || ignored === null) return "-";
	if (typeof ignored === "string") return `s${ignored}`;
	if (Array.isArray(ignored)) return `a${JSON.stringify(ignored)}`;
	if (!(ignored instanceof RegExp)) return "";
	let key = regExpKeys.get(ignored);
	if (key === undefined) {
		key = `r${nextRegExpKey++}`;
		regExpKeys.set(ignored, key);
	}
	return key;
};

// Snapshot rather than keep the caller's object: mutating it later would hand
// the next caller options it never asked for.
/**
 * @param {WatchOptions} options watch options
 * @returns {WatchOptions} a shared object equal to `options`, or `options`
 */
const getCanonicalWatchOptions = (options) => {
	const ignored = ignoredKey(options.ignored);
	if (ignored === "") return options;
	const key = `${options.aggregateTimeout}|${Boolean(
		options.followSymlinks
	)}|${options.poll}|${ignored}`;
	const canonical = canonicalWatchOptions.get(key);
	if (canonical !== undefined) return canonical;
	/** @type {WatchOptions} */
	const snapshot = {
		aggregateTimeout: options.aggregateTimeout,
		followSymlinks: options.followSymlinks,
		ignored: Array.isArray(options.ignored)
			? [...options.ignored]
			: options.ignored,
		poll: options.poll
	};
	canonicalWatchOptions.set(key, snapshot);
	return snapshot;
};

class NodeWatchFileSystem {
	/**
	 * Creates an instance of NodeWatchFileSystem.
	 * @param {InputFileSystem} inputFileSystem input filesystem
	 */
	constructor(inputFileSystem) {
		/** @type {InputFileSystem} */
		this.inputFileSystem = inputFileSystem;
		/** @type {WatchOptions} */
		this.watcherOptions = {
			aggregateTimeout: 0
		};
		// `watch` replaces this with a watcher built from its own options
		/** @type {Watchpack | null} */
		this.watcher = null;
	}

	/** @type {WatchMethod} */
	watch(
		files,
		directories,
		missing,
		startTime,
		options,
		callback,
		callbackUndelayed
	) {
		if (!files || typeof files[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'files'");
		}
		if (!directories || typeof directories[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'directories'");
		}
		if (!missing || typeof missing[Symbol.iterator] !== "function") {
			throw new Error("Invalid arguments: 'missing'");
		}
		if (typeof callback !== "function") {
			throw new Error("Invalid arguments: 'callback'");
		}
		if (typeof startTime !== "number" && startTime) {
			throw new Error("Invalid arguments: 'startTime'");
		}
		if (typeof options !== "object") {
			throw new Error("Invalid arguments: 'options'");
		}
		if (typeof callbackUndelayed !== "function" && callbackUndelayed) {
			throw new Error("Invalid arguments: 'callbackUndelayed'");
		}
		const oldWatcher = this.watcher;
		this.watcher = new (getWatchpack())(getCanonicalWatchOptions(options));

		if (callbackUndelayed) {
			this.watcher.once("change", callbackUndelayed);
		}

		const fetchTimeInfo = () => {
			/** @type {TimeInfoEntries} */
			const fileTimeInfoEntries = new Map();
			/** @type {TimeInfoEntries} */
			const contextTimeInfoEntries = new Map();
			if (this.watcher) {
				this.watcher.collectTimeInfoEntries(
					fileTimeInfoEntries,
					contextTimeInfoEntries
				);
			}
			return { fileTimeInfoEntries, contextTimeInfoEntries };
		};
		const directoriesSet =
			directories instanceof Set ? directories : new Set(directories);

		// Watchpack reports a watched directory (a context dependency) in
		// `changes` whenever its contents change, alongside the individual
		// file events. The default `fs.purge(dir)` matches cache keys by
		// prefix, so it would wipe the stat cache of every file inside the
		// directory even though only file-level events actually invalidate
		// file stats. For directories we explicitly watch, purge only the
		// directory's own entry (`{ exact: true }`, enhanced-resolve >=
		// 5.22.0); file-level events in the same aggregated batch still
		// handle file stats and the parent readdir invalidation.
		/**
		 * @param {Changes | null | undefined} changes changes set
		 * @param {Removals | null | undefined} removals removals set
		 */
		const purgeChanges = (changes, removals) => {
			const fs = this.inputFileSystem;
			if (!fs || !fs.purge) return;
			if (changes) {
				for (const item of changes) {
					if (directoriesSet.has(item)) {
						fs.purge(item, { exact: true });
					} else {
						fs.purge(item);
					}
				}
			}
			if (removals) {
				for (const item of removals) {
					fs.purge(item);
				}
			}
		};

		this.watcher.once(
			"aggregated",
			/**
			 * Handles the callback logic for this hook.
			 * @param {Changes} changes changes
			 * @param {Removals} removals removals
			 */
			(changes, removals) => {
				// pause emitting events (avoids clearing aggregated changes and removals on timeout)
				/** @type {Watchpack} */
				(this.watcher).pause();

				purgeChanges(changes, removals);
				const { fileTimeInfoEntries, contextTimeInfoEntries } = fetchTimeInfo();
				callback(
					null,
					fileTimeInfoEntries,
					contextTimeInfoEntries,
					changes,
					removals
				);
			}
		);

		this.watcher.watch({ files, directories, missing, startTime });

		if (oldWatcher) {
			oldWatcher.close();
		}
		return {
			close: () => {
				if (this.watcher) {
					this.watcher.close();
					this.watcher = null;
				}
			},
			pause: () => {
				if (this.watcher) {
					this.watcher.pause();
				}
			},
			getAggregatedRemovals: util.deprecate(
				() => {
					const items = this.watcher && this.watcher.aggregatedRemovals;
					const fs = this.inputFileSystem;
					if (items && fs && fs.purge) {
						for (const item of items) {
							fs.purge(item);
						}
					}
					return items;
				},
				"Watcher.getAggregatedRemovals is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_GET_AGGREGATED_REMOVALS"
			),
			getAggregatedChanges: util.deprecate(
				() => {
					const items = this.watcher && this.watcher.aggregatedChanges;
					const fs = this.inputFileSystem;
					if (items && fs && fs.purge) {
						for (const item of items) {
							fs.purge(item);
						}
					}
					return items;
				},
				"Watcher.getAggregatedChanges is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_GET_AGGREGATED_CHANGES"
			),
			getFileTimeInfoEntries: util.deprecate(
				() => fetchTimeInfo().fileTimeInfoEntries,
				"Watcher.getFileTimeInfoEntries is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_FILE_TIME_INFO_ENTRIES"
			),
			getContextTimeInfoEntries: util.deprecate(
				() => fetchTimeInfo().contextTimeInfoEntries,
				"Watcher.getContextTimeInfoEntries is deprecated in favor of Watcher.getInfo since that's more performant.",
				"DEP_WEBPACK_WATCHER_CONTEXT_TIME_INFO_ENTRIES"
			),
			getInfo: () => {
				const removals = this.watcher && this.watcher.aggregatedRemovals;
				const changes = this.watcher && this.watcher.aggregatedChanges;
				purgeChanges(changes, removals);
				const { fileTimeInfoEntries, contextTimeInfoEntries } = fetchTimeInfo();
				return {
					changes,
					removals,
					fileTimeInfoEntries,
					contextTimeInfoEntries
				};
			}
		};
	}
}

module.exports = NodeWatchFileSystem;
