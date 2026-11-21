/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { dirname, join, relative } = require("../fs/fs");
const { isOutsideDirectory } = require("../util/identifier");

/** @import { Output } from "../../declarations/WebpackOptions" */
/** @import { OutputFileSystem } from "../fs/fs" */

/**
 * Whether `output.allowOutside` lets a file be written at a path outside of `output.path`.
 * @param {OutputFileSystem} fs output file system
 * @param {Output["allowOutside"]} allowOutside the option, `undefined` allows nothing
 * @param {string} targetPath absolute path of the file
 * @returns {boolean} true, when the path is inside a directory the option lists, or it is `true`
 */
const isOutsideAllowed = (fs, allowOutside, targetPath) => {
	if (allowOutside === true) return true;
	if (!Array.isArray(allowOutside)) return false;
	for (const directory of allowOutside) {
		if (!isOutsideDirectory(relative(fs, directory, targetPath))) return true;
	}
	return false;
};

/**
 * Creates a function that resolves where a directory really is, following
 * links in the part of it that exists; a missing rest is joined back on.
 * Results are cached for the life of the function.
 * @param {OutputFileSystem} fs output file system
 * @returns {(directory: string, callback: (realDirectory: string) => void) => void} resolver
 */
const createRealDirectoryResolver = (fs) => {
	/** @type {Map<string, string | ((realDirectory: string) => void)[]>} */
	const results = new Map();
	/**
	 * Resolves one directory.
	 * @param {string} directory absolute path of the directory
	 * @param {(realDirectory: string) => void} callback callback
	 * @returns {void}
	 */
	const resolve = (directory, callback) => {
		// a file system that cannot tell has no links to follow
		if (!fs.realpath) return callback(directory);
		const result = results.get(directory);
		if (typeof result === "string") return callback(result);
		if (result !== undefined) {
			result.push(callback);
			return;
		}
		/** @type {((realDirectory: string) => void)[]} */
		const callbacks = [callback];
		results.set(directory, callbacks);
		/**
		 * Settles every waiting callback.
		 * @param {string} realDirectory the real directory
		 * @returns {void}
		 */
		const done = (realDirectory) => {
			results.set(directory, realDirectory);
			for (const fn of callbacks) fn(realDirectory);
		};
		fs.realpath(directory, (err, realDirectory) => {
			if (!err) return done(/** @type {string} */ (realDirectory));
			const parent = dirname(fs, directory);
			// not created yet: links can only be in the part that exists
			if (err.code !== "ENOENT" || parent === directory) {
				return done(directory);
			}
			resolve(parent, (realParent) =>
				done(join(fs, realParent, relative(fs, parent, directory)))
			);
		});
	};
	return resolve;
};

module.exports.createRealDirectoryResolver = createRealDirectoryResolver;
module.exports.isOutsideAllowed = isOutsideAllowed;
