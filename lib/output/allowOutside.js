/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { dirname, isAbsolute, join, relative } = require("../fs/fs");
const { isOutsideDirectory } = require("../util/identifier");

/** @import { Output } from "../../declarations/WebpackOptions" */
/** @import { IStats, OutputFileSystem } from "../fs/fs" */

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

/**
 * Creates a function that tells where a directory really is when links lead
 * it out of `outputPath`, with the real directories `allowOutside` lists.
 * @param {OutputFileSystem} fs output file system
 * @param {string} outputPath absolute path of `output.path`
 * @param {Output["allowOutside"]} allowOutside the option
 * @returns {(directory: string, callback: (realDirectory: string | undefined, realAllowed: string[] | undefined) => void) => void} resolver giving the real directory only when it is outside
 */
const createRealOutsideResolver = (fs, outputPath, allowOutside) => {
	const resolve = createRealDirectoryResolver(fs);
	return (directory, callback) => {
		resolve(outputPath, (realOutput) => {
			resolve(directory, (realDirectory) => {
				if (!isOutsideDirectory(relative(fs, realOutput, realDirectory))) {
					return callback(undefined, undefined);
				}
				if (!Array.isArray(allowOutside) || allowOutside.length === 0) {
					return callback(realDirectory, undefined);
				}
				/** @type {string[]} */
				const realAllowed = [];
				/**
				 * Resolves the allowed directories one after another.
				 * @returns {void}
				 */
				const next = () => {
					if (realAllowed.length === allowOutside.length) {
						return callback(realDirectory, realAllowed);
					}
					resolve(allowOutside[realAllowed.length], (realAllowedDirectory) => {
						realAllowed.push(realAllowedDirectory);
						next();
					});
				};
				next();
			});
		});
	};
};

// as many links as Linux follows before it gives up with ELOOP
const MAX_LINKS = 40;

/**
 * Follows a file that is a link to the path it leads to, which need not exist.
 * @param {OutputFileSystem} fs output file system
 * @param {string} file absolute path of the file
 * @param {(target: string | undefined, stats: IStats | undefined) => void} callback the path the links lead to, `undefined` when the file is no link; the stats of the file when it is no link
 * @returns {void}
 */
const resolveLinkedFile = (fs, file, callback) => {
	const { lstat, readlink } = fs;
	if (!lstat || !readlink) return callback(undefined, undefined);
	/** @type {string | undefined} */
	let target;
	let links = 0;
	/**
	 * Follows one link.
	 * @param {string} path the path
	 * @returns {void}
	 */
	const next = (path) => {
		lstat(path, (err, stats) => {
			if (err || !(/** @type {IStats} */ (stats).isSymbolicLink())) {
				return callback(target, target === undefined ? stats : undefined);
			}
			if (++links > MAX_LINKS) return callback(path, undefined);
			readlink(path, (err, link) => {
				if (err) return callback(path, undefined);
				const value = /** @type {string} */ (link).toString();
				target = isAbsolute(value) ? value : join(fs, dirname(fs, path), value);
				next(target);
			});
		});
	};
	next(file);
};

module.exports.createRealDirectoryResolver = createRealDirectoryResolver;
module.exports.createRealOutsideResolver = createRealOutsideResolver;
module.exports.isOutsideAllowed = isOutsideAllowed;
module.exports.resolveLinkedFile = resolveLinkedFile;
