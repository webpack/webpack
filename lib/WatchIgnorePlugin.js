/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { validate } = require("schema-utils");
const schema = require("../schemas/plugins/WatchIgnorePlugin.json");

/** @typedef {import("../declarations/plugins/WatchIgnorePlugin").WatchIgnorePluginOptions} WatchIgnorePluginOptions */
/** @typedef {import("./Compiler")} Compiler */

const IGNORE_TIME_ENTRY = "ignore";

class IgnoringWatchFileSystem {
	constructor(wfs, paths) {
		this.wfs = wfs;
		this.paths = paths;
	}

	watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
		files = Array.from(files);
		dirs = Array.from(dirs);
		const ignored = path =>
			this.paths.some(p =>
				p instanceof RegExp ? p.test(path) : path.indexOf(p) === 0
			);

		const notIgnored = path => !ignored(path);

		const ignoredFiles = files.filter(ignored);
		const ignoredDirs = dirs.filter(ignored);

		const watcher = this.wfs.watch(
			files.filter(notIgnored),
			dirs.filter(notIgnored),
			missing,
			startTime,
			options,
			(err, fileTimestamps, dirTimestamps, changedFiles, removedFiles) => {
				if (err) return callback(err);
				for (const path of ignoredFiles) {
					fileTimestamps.set(path, IGNORE_TIME_ENTRY);
				}

				for (const path of ignoredDirs) {
					dirTimestamps.set(path, IGNORE_TIME_ENTRY);
				}

				callback(
					err,
					fileTimestamps,
					dirTimestamps,
					changedFiles,
					removedFiles
				);
			},
			callbackUndelayed
		);

		return {
			close: () => watcher.close(),
			pause: () => watcher.pause(),
			getContextTimeInfoEntries: () => {
				const dirTimestamps = watcher.getContextInfoEntries();
				for (const path of ignoredDirs) {
					dirTimestamps.set(path, IGNORE_TIME_ENTRY);
				}
				return dirTimestamps;
			},
			getFileTimeInfoEntries: () => {
				const fileTimestamps = watcher.getFileTimeInfoEntries();
				for (const path of ignoredFiles) {
					fileTimestamps.set(path, IGNORE_TIME_ENTRY);
				}
				return fileTimestamps;
			}
		};
	}
}

class WatchIgnorePlugin {
	/**
	 * @param {WatchIgnorePluginOptions} options options
	 */
	constructor(options) {
		validate(schema, options, {
			name: "Watch Ignore Plugin",
			baseDataPath: "options"
		});
		this.paths = options.paths;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.afterEnvironment.tap("WatchIgnorePlugin", () => {
			compiler.watchFileSystem = new IgnoringWatchFileSystem(
				compiler.watchFileSystem,
				this.paths
			);
		});
	}
}

module.exports = WatchIgnorePlugin;
