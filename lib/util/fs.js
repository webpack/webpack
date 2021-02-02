/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

/** @typedef {import("../../declarations/WebpackOptions").WatchOptions} WatchOptions */
/** @typedef {import("../FileSystemInfo").FileSystemInfoEntry} FileSystemInfoEntry */

/**
 * @typedef {Object} IStats
 * @property {() => boolean} isFile
 * @property {() => boolean} isDirectory
 * @property {() => boolean} isBlockDevice
 * @property {() => boolean} isCharacterDevice
 * @property {() => boolean} isSymbolicLink
 * @property {() => boolean} isFIFO
 * @property {() => boolean} isSocket
 * @property {number | bigint} dev
 * @property {number | bigint} ino
 * @property {number | bigint} mode
 * @property {number | bigint} nlink
 * @property {number | bigint} uid
 * @property {number | bigint} gid
 * @property {number | bigint} rdev
 * @property {number | bigint} size
 * @property {number | bigint} blksize
 * @property {number | bigint} blocks
 * @property {number | bigint} atimeMs
 * @property {number | bigint} mtimeMs
 * @property {number | bigint} ctimeMs
 * @property {number | bigint} birthtimeMs
 * @property {Date} atime
 * @property {Date} mtime
 * @property {Date} ctime
 * @property {Date} birthtime
 */

/**
 * @typedef {Object} IDirent
 * @property {() => boolean} isFile
 * @property {() => boolean} isDirectory
 * @property {() => boolean} isBlockDevice
 * @property {() => boolean} isCharacterDevice
 * @property {() => boolean} isSymbolicLink
 * @property {() => boolean} isFIFO
 * @property {() => boolean} isSocket
 * @property {string | Buffer} name
 */

/** @typedef {function(NodeJS.ErrnoException=): void} Callback */
/** @typedef {function(NodeJS.ErrnoException=, Buffer=): void} BufferCallback */
/** @typedef {function(NodeJS.ErrnoException=, Buffer|string=): void} BufferOrStringCallback */
/** @typedef {function(NodeJS.ErrnoException=, (string | Buffer)[] | IDirent[]=): void} DirentArrayCallback */
/** @typedef {function(NodeJS.ErrnoException=, string=): void} StringCallback */
/** @typedef {function(NodeJS.ErrnoException=, number=): void} NumberCallback */
/** @typedef {function(NodeJS.ErrnoException=, IStats=): void} StatsCallback */
/** @typedef {function((NodeJS.ErrnoException | Error)=, any=): void} ReadJsonCallback */

/**
 * @typedef {Object} Watcher
 * @property {function(): void} close closes the watcher and all underlying file watchers
 * @property {function(): void} pause closes the watcher, but keeps underlying file watchers alive until the next watch call
 * @property {function(): Map<string, FileSystemInfoEntry | "ignore">} getFileTimeInfoEntries get info about files
 * @property {function(): Map<string, FileSystemInfoEntry | "ignore">} getContextTimeInfoEntries get info about directories
 */

/**
 * @callback WatchMethod
 * @param {Iterable<string>} files watched files
 * @param {Iterable<string>} directories watched directories
 * @param {Iterable<string>} missing watched exitance entries
 * @param {number} startTime timestamp of start time
 * @param {WatchOptions} options options object
 * @param {function(Error=, Map<string, FileSystemInfoEntry | "ignore">, Map<string, FileSystemInfoEntry | "ignore">, Set<string>, Set<string>): void} callback aggregated callback
 * @param {function(string, number): void} callbackUndelayed callback when the first change was detected
 * @returns {Watcher} a watcher
 */

/**
 * @typedef {Object} OutputFileSystem
 * @property {function(string, Buffer|string, Callback): void} writeFile
 * @property {function(string, Callback): void} mkdir
 * @property {function(string, DirentArrayCallback): void=} readdir
 * @property {function(string, Callback): void=} rmdir
 * @property {function(string, Callback): void=} unlink
 * @property {function(string, StatsCallback): void} stat
 * @property {function(string, BufferOrStringCallback): void} readFile
 * @property {(function(string, string): string)=} join
 * @property {(function(string, string): string)=} relative
 * @property {(function(string): string)=} dirname
 */

/**
 * @typedef {Object} InputFileSystem
 * @property {function(string, BufferOrStringCallback): void} readFile
 * @property {(function(string, ReadJsonCallback): void)=} readJson
 * @property {function(string, BufferOrStringCallback): void} readlink
 * @property {function(string, DirentArrayCallback): void} readdir
 * @property {function(string, StatsCallback): void} stat
 * @property {(function(string, BufferOrStringCallback): void)=} realpath
 * @property {(function(string=): void)=} purge
 * @property {(function(string, string): string)=} join
 * @property {(function(string, string): string)=} relative
 * @property {(function(string): string)=} dirname
 */

/**
 * @typedef {Object} WatchFileSystem
 * @property {WatchMethod} watch
 */

/**
 * @typedef {Object} IntermediateFileSystemExtras
 * @property {function(string): void} mkdirSync
 * @property {function(string): NodeJS.WritableStream} createWriteStream
 * @property {function(string, string, NumberCallback): void} open
 * @property {function(number, Buffer, number, number, number, NumberCallback): void} read
 * @property {function(number, Callback): void} close
 * @property {function(string, string, Callback): void} rename
 */

/** @typedef {InputFileSystem & OutputFileSystem & IntermediateFileSystemExtras} IntermediateFileSystem */

/**
 *
 * @param {InputFileSystem|OutputFileSystem|undefined} fs a file system
 * @param {string} rootPath the root path
 * @param {string} targetPath the target path
 * @returns {string} location of targetPath relative to rootPath
 */
const relative = (fs, rootPath, targetPath) => {
	if (fs && fs.relative) {
		return fs.relative(rootPath, targetPath);
	} else if (rootPath.startsWith("/")) {
		return path.posix.relative(rootPath, targetPath);
	} else if (rootPath.length > 1 && rootPath[1] === ":") {
		return path.win32.relative(rootPath, targetPath);
	} else {
		throw new Error(
			`${rootPath} is neither a posix nor a windows path, and there is no 'relative' method defined in the file system`
		);
	}
};
exports.relative = relative;

/**
 * @param {InputFileSystem|OutputFileSystem|undefined} fs a file system
 * @param {string} rootPath a path
 * @param {string} filename a filename
 * @returns {string} the joined path
 */
const join = (fs, rootPath, filename) => {
	if (fs && fs.join) {
		return fs.join(rootPath, filename);
	} else if (rootPath.startsWith("/")) {
		return path.posix.join(rootPath, filename);
	} else if (rootPath.length > 1 && rootPath[1] === ":") {
		return path.win32.join(rootPath, filename);
	} else {
		throw new Error(
			`${rootPath} is neither a posix nor a windows path, and there is no 'join' method defined in the file system`
		);
	}
};
exports.join = join;

/**
 * @param {InputFileSystem|OutputFileSystem|undefined} fs a file system
 * @param {string} absPath an absolute path
 * @returns {string} the parent directory of the absolute path
 */
const dirname = (fs, absPath) => {
	if (fs && fs.dirname) {
		return fs.dirname(absPath);
	} else if (absPath.startsWith("/")) {
		return path.posix.dirname(absPath);
	} else if (absPath.length > 1 && absPath[1] === ":") {
		return path.win32.dirname(absPath);
	} else {
		throw new Error(
			`${absPath} is neither a posix nor a windows path, and there is no 'dirname' method defined in the file system`
		);
	}
};
exports.dirname = dirname;

/**
 * @param {OutputFileSystem} fs a file system
 * @param {string} p an absolute path
 * @param {function(Error=): void} callback callback function for the error
 * @returns {void}
 */
const mkdirp = (fs, p, callback) => {
	fs.mkdir(p, err => {
		if (err) {
			if (err.code === "ENOENT") {
				const dir = dirname(fs, p);
				if (dir === p) {
					callback(err);
					return;
				}
				mkdirp(fs, dir, err => {
					if (err) {
						callback(err);
						return;
					}
					fs.mkdir(p, err => {
						if (err) {
							if (err.code === "EEXIST") {
								callback();
								return;
							}
							callback(err);
							return;
						}
						callback();
					});
				});
				return;
			} else if (err.code === "EEXIST") {
				callback();
				return;
			}
			callback(err);
			return;
		}
		callback();
	});
};
exports.mkdirp = mkdirp;

/**
 * @param {IntermediateFileSystem} fs a file system
 * @param {string} p an absolute path
 * @returns {void}
 */
const mkdirpSync = (fs, p) => {
	try {
		fs.mkdirSync(p);
	} catch (err) {
		if (err) {
			if (err.code === "ENOENT") {
				const dir = dirname(fs, p);
				if (dir === p) {
					throw err;
				}
				mkdirpSync(fs, dir);
				fs.mkdirSync(p);
				return;
			} else if (err.code === "EEXIST") {
				return;
			}
			throw err;
		}
	}
};
exports.mkdirpSync = mkdirpSync;

/**
 * @param {InputFileSystem} fs a file system
 * @param {string} p an absolute path
 * @param {ReadJsonCallback} callback callback
 * @returns {void}
 */
const readJson = (fs, p, callback) => {
	if ("readJson" in fs) return fs.readJson(p, callback);
	fs.readFile(p, (err, buf) => {
		if (err) return callback(err);
		let data;
		try {
			data = JSON.parse(buf.toString("utf-8"));
		} catch (e) {
			return callback(e);
		}
		return callback(null, data);
	});
};
exports.readJson = readJson;
