/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncQueue = require("./util/AsyncQueue");

let FS_ACCURACY = 2000;

/**
 * @typedef {Object} FileSystemInfoEntry
 * @property {number} safeTime
 * @property {number} timestamp
 */

/* istanbul ignore next */
const applyMtime = mtime => {
	if (FS_ACCURACY > 1 && mtime % 2 !== 0) FS_ACCURACY = 1;
	else if (FS_ACCURACY > 10 && mtime % 20 !== 0) FS_ACCURACY = 10;
	else if (FS_ACCURACY > 100 && mtime % 200 !== 0) FS_ACCURACY = 100;
	else if (FS_ACCURACY > 1000 && mtime % 2000 !== 0) FS_ACCURACY = 1000;
};

class FileSystemInfo {
	constructor(fs) {
		this.fs = fs;
		this._fileTimestamps = new Map();
		this._contextTimestamps = new Map();
		this.fileTimestampQueue = new AsyncQueue({
			name: "file timestamp",
			parallelism: 30,
			processor: this._readFileTimestamp.bind(this)
		});
		this.contextTimestampQueue = new AsyncQueue({
			name: "context timestamp",
			parallelism: 2,
			processor: this._readContextTimestamp.bind(this)
		});
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry>} map timestamps
	 * @returns {void}
	 */
	addFileTimestamps(map) {
		for (const [path, ts] of map) {
			this._fileTimestamps.set(path, ts);
		}
	}

	/**
	 * @param {Map<string, FileSystemInfoEntry>} map timestamps
	 * @returns {void}
	 */
	addContextTimestamps(map) {
		for (const [path, ts] of map) {
			this._contextTimestamps.set(path, ts);
		}
	}

	/**
	 * @param {string} path file path
	 * @param {function(Error=, FileSystemInfoEntry=): void} callback callback function
	 * @returns {void}
	 */
	getFileTimestamp(path, callback) {
		const cache = this._fileTimestamps.get(path);
		if (cache !== undefined) return cache;
		this.fileTimestampQueue.add(path, callback);
	}

	/**
	 * @param {string} path context path
	 * @param {function(Error=, FileSystemInfoEntry=): void} callback callback function
	 * @returns {void}
	 */
	getContextTimestamp(path, callback) {
		const cache = this._contextTimestamps.get(path);
		if (cache !== undefined) return cache;
		this.contextTimestampQueue.add(path, callback);
	}

	// TODO getFileHash(path, callback)

	_readFileTimestamp(path, callback) {
		this.fs.stat(path, (err, stat) => {
			if (err) {
				if (err.code === "ENOENT") {
					this._fileTimestamps.set(path, null);
					return callback(null, null);
				}
				return callback(err);
			}

			if (stat.mtime) applyMtime(+stat.mtime);

			const mtime = +stat.mtime || Infinity;
			const ts = {
				safeTime: mtime + FS_ACCURACY,
				timestamp: mtime
			};

			this._fileTimestamps.set(path, ts);

			callback(null, ts);
		});
	}

	_readContextTimestamp(path, callback) {
		// TODO read whole folder
		this._contextTimestamps.set(path, null);
		callback(null, null);
	}

	getDeprecatedFileTimestamps() {
		const map = new Map();
		for (const [path, info] of this._fileTimestamps) {
			if (info) map.set(path, info.safeTime);
		}
		return map;
	}

	getDeprecatedContextTimestamps() {
		const map = new Map();
		for (const [path, info] of this._contextTimestamps) {
			if (info) map.set(path, info.safeTime);
		}
		return map;
	}
}

module.exports = FileSystemInfo;
