/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

/** @typedef {import("fs").Stats} NodeFsStats */

/** @typedef {function(NodeJS.ErrnoException=): void} Callback */
/** @typedef {function(NodeJS.ErrnoException=, Buffer=): void} BufferCallback */
/** @typedef {function(NodeJS.ErrnoException=, string[]=): void} StringArrayCallback */
/** @typedef {function(NodeJS.ErrnoException=, string=): void} StringCallback */
/** @typedef {function(NodeJS.ErrnoException=, NodeFsStats=): void} StatsCallback */

/**
 * @typedef {Object} OutputFileSystem
 * @property {function(string, Buffer|string, Callback): void} writeFile
 * @property {function(string, Callback): void} mkdir
 * @property {function(string, StatsCallback): void} stat
 * @property {function(string, BufferCallback): void} readFile
 * @property {(function(string, string): string)=} join
 * @property {(function(string, string): string)=} relative
 * @property {(function(string): string)=} dirname
 */

/**
 * @typedef {Object} InputFileSystem
 * @property {function(string, BufferCallback): void} readFile
 * @property {function(string, StringArrayCallback): void} readdir
 * @property {function(string, StatsCallback): void} stat
 * @property {(function(string, StringCallback): void)=} realpath
 * @property {(function(string=): void)=} purge
 * @property {(function(string, string): string)=} join
 * @property {(function(string, string): string)=} relative
 * @property {(function(string): string)=} dirname
 */

/**
 * @typedef {Object} IntermediateFileSystemExtras
 * @property {function(string): void} mkdirSync
 * @property {function(string): import("fs").WriteStream} createWriteStream
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
