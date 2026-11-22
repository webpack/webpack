/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { dirname, isAbsolute, join, relative } = require("../fs/fs");
const {
	PATH_SEPARATOR_REGEXP,
	POSIX_PATH_SEPARATOR_REGEXP,
	isOutsideDirectory
} = require("../util/identifier");

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
 * Gets the root of an absolute path, such as `/` or `C:\\`.
 * @param {OutputFileSystem} fs output file system
 * @param {string} path absolute path
 * @returns {string} its root
 */
const getRoot = (fs, path) => {
	let root = path;
	for (let parent = dirname(fs, root); parent !== root;) {
		root = parent;
		parent = dirname(fs, root);
	}
	return root;
};

/**
 * Follows a file that is a link to where it leads, as a write through it does:
 * part by part, each link followed before a `..` after it. A missing rest is
 * joined back on, so the file it leads to need not exist.
 * @param {OutputFileSystem} fs output file system
 * @param {string} file absolute path of the link
 * @param {(target: string | undefined) => void} callback the real path it leads to, `undefined` when links cannot be told
 * @returns {void}
 */
const resolveLinkedFile = (fs, file, callback) => {
	if (!fs.lstat || !fs.readlink) return callback(undefined);
	let links = 0;
	/** @type {RegExp} */
	let separator;
	/**
	 * Walks the parts left from a real directory.
	 * @param {string} current the real directory reached
	 * @param {string[]} parts the parts left
	 * @returns {void}
	 */
	const walk = (current, parts) => {
		if (parts.length === 0) return callback(current);
		const part = parts[0];
		const rest = parts.slice(1);
		if (part === "" || part === ".") return walk(current, rest);
		if (part === "..") return walk(dirname(fs, current), rest);
		const next = join(fs, current, part);
		/** @type {NonNullable<OutputFileSystem["lstat"]>} */
		(fs.lstat)(next, (err, stats) => {
			// what is missing holds no link
			if (err) return callback(join(fs, next, rest.join("/")));
			if (!(/** @type {IStats} */ (stats).isSymbolicLink())) {
				return walk(next, rest);
			}
			if (++links > MAX_LINKS) return callback(next);
			/** @type {NonNullable<OutputFileSystem["readlink"]>} */
			(fs.readlink)(next, (err, link) => {
				if (err) return callback(next);
				const value = /** @type {string} */ (link).toString();
				const start = isAbsolute(value) ? getRoot(fs, value) : current;
				const linkParts = (
					isAbsolute(value) ? value.slice(start.length) : value
				).split(separator);
				walk(start, [...linkParts, ...rest]);
			});
		});
	};
	const root = getRoot(fs, file);
	// as the system splits it: a POSIX path only at "/"
	separator =
		root === "/" ? POSIX_PATH_SEPARATOR_REGEXP : PATH_SEPARATOR_REGEXP;
	walk(root, file.slice(root.length).split(separator));
};

module.exports.createRealDirectoryResolver = createRealDirectoryResolver;
module.exports.createRealOutsideResolver = createRealOutsideResolver;
module.exports.isOutsideAllowed = isOutsideAllowed;
module.exports.resolveLinkedFile = resolveLinkedFile;
