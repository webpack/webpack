/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class WatchIgnorePlugin {
	constructor(paths) {
		this.paths = paths;
	}

	apply(compiler) {
		compiler.plugin("after-environment", () => {
			compiler.watchFileSystem = new IgnoringWatchFileSystem(compiler.watchFileSystem, this.paths);
		});
	}
}

module.exports = WatchIgnorePlugin;

class IgnoringWatchFileSystem {
	constructor(wfs, paths) {
		this.wfs = wfs;
		this.paths = paths;
	}

	watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
		const ignored = path => this.paths.some(p => p instanceof RegExp ? p.test(path) : path.indexOf(p) === 0);

		const notIgnored = path => !ignored(path);

		const ignoredFiles = files.filter(ignored);
		const ignoredDirs = dirs.filter(ignored);

		this.wfs.watch(files.filter(notIgnored), dirs.filter(notIgnored), missing, startTime, options, (err, filesModified, dirsModified, missingModified, fileTimestamps, dirTimestamps) => {
			if(err) return callback(err);

			ignoredFiles.forEach(path => {
				fileTimestamps[path] = 1;
			});

			ignoredDirs.forEach(path => {
				dirTimestamps[path] = 1;
			});

			callback(err, filesModified, dirsModified, missingModified, fileTimestamps, dirTimestamps);
		}, callbackUndelayed);
	}
}
