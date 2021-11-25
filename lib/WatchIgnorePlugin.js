/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { groupBy } = require("./util/ArrayHelpers");
const createSchemaValidation = require("./util/create-schema-validation");

/** @typedef {import("../declarations/plugins/WatchIgnorePlugin").WatchIgnorePluginOptions} WatchIgnorePluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./util/fs").WatchFileSystem} WatchFileSystem */

const validate = createSchemaValidation(
	require("../schemas/plugins/WatchIgnorePlugin.check.js"),
	() => require("../schemas/plugins/WatchIgnorePlugin.json"),
	{
		name: "Watch Ignore Plugin",
		baseDataPath: "options"
	}
);

const IGNORE_TIME_ENTRY = "ignore";

class IgnoringWatchFileSystem {
	/**
	 * @param {WatchFileSystem} wfs original file system
	 * @param {(string|RegExp)[]} paths ignored paths
	 */
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

		const [ignoredFiles, notIgnoredFiles] = groupBy(files, ignored);
		const [ignoredDirs, notIgnoredDirs] = groupBy(dirs, ignored);

		const watcher = this.wfs.watch(
			notIgnoredFiles,
			notIgnoredDirs,
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
				const dirTimestamps = watcher.getContextTimeInfoEntries();
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
			},
			getInfo:
				watcher.getInfo &&
				(() => {
					const info = watcher.getInfo();
					const { fileTimeInfoEntries, contextTimeInfoEntries } = info;
					for (const path of ignoredFiles) {
						fileTimeInfoEntries.set(path, IGNORE_TIME_ENTRY);
					}
					for (const path of ignoredDirs) {
						contextTimeInfoEntries.set(path, IGNORE_TIME_ENTRY);
					}
					return info;
				})
		};
	}
}

class WatchIgnorePlugin {
	/**
	 * @param {WatchIgnorePluginOptions} options options
	 */
	constructor(options) {
		validate(options);
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
