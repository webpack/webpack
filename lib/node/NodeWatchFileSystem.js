/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Watchpack = require("watchpack");

/** @typedef {import("../FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */
/** @typedef {import("../util/fs").WatchFileSystem} WatchFileSystem */
/** @typedef {import("../util/fs").WatchMethod} WatchMethod */
/** @typedef {import("../util/fs").Watcher} Watcher */

class NodeWatchFileSystem {
	constructor(inputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		this.watcherOptions = {
			aggregateTimeout: 0
		};
		this.watcher = new Watchpack(this.watcherOptions);
	}

	/**
	 * @param {Iterable<string>} files watched files
	 * @param {Iterable<string>} directories watched directories
	 * @param {Iterable<string>} missing watched exitance entries
	 * @param {number} startTime timestamp of start time
	 * @param {TODO} options options object
	 * @param {function(Error=, Map<string, FileSystemInfoEntry>, Map<string, FileSystemInfoEntry>, Set<string>, Set<string>): void} callback aggregated callback
	 * @param {function(string, number): void} callbackUndelayed callback when the first change was detected
	 * @returns {Watcher} a watcher
	 */
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
		this.watcher = new Watchpack(options);

		if (callbackUndelayed) {
			this.watcher.once("change", callbackUndelayed);
		}
		this.watcher.once("aggregated", (changes, removals) => {
			if (this.inputFileSystem && this.inputFileSystem.purge) {
				for (const item of changes) {
					this.inputFileSystem.purge(item);
				}
				for (const item of removals) {
					this.inputFileSystem.purge(item);
				}
			}
			const times = this.watcher.getTimeInfoEntries();
			callback(null, times, times, changes, removals);
		});

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
			getFileTimeInfoEntries: () => {
				if (this.watcher) {
					return this.watcher.getTimeInfoEntries();
				} else {
					return new Map();
				}
			},
			getContextTimeInfoEntries: () => {
				if (this.watcher) {
					return this.watcher.getTimeInfoEntries();
				} else {
					return new Map();
				}
			}
		};
	}
}

module.exports = NodeWatchFileSystem;
