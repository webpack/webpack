/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { join, dirname, readJson } = require("../util/fs");

/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

/**
 * @param {string} str maybe required version
 * @returns {boolean} true, if it looks like a version
 */
exports.isRequiredVersion = str => {
	return /^([\d^=v<>~]|[*xX]$)/.test(str);
};

/**
 *
 * @param {InputFileSystem} fs file system
 * @param {string} directory directory to start looking into
 * @param {string[]} descriptionFiles possible description filenames
 * @param {function((Error | null)=, {data: object, path: string}=): void} callback callback
 */
const getDescriptionFile = (fs, directory, descriptionFiles, callback) => {
	let i = 0;
	const tryLoadCurrent = () => {
		if (i >= descriptionFiles.length) {
			const parentDirectory = dirname(fs, directory);
			if (!parentDirectory || parentDirectory === directory) return callback();
			return getDescriptionFile(
				fs,
				parentDirectory,
				descriptionFiles,
				callback
			);
		}
		const filePath = join(fs, directory, descriptionFiles[i]);
		readJson(fs, filePath, (err, data) => {
			if (err) {
				if ("code" in err && err.code === "ENOENT") {
					i++;
					return tryLoadCurrent();
				}
				return callback(err);
			}
			if (!data || typeof data !== "object" || Array.isArray(data)) {
				return callback(
					new Error(`Description file ${filePath} is not an object`)
				);
			}
			callback(null, { data, path: filePath });
		});
	};
	tryLoadCurrent();
};
exports.getDescriptionFile = getDescriptionFile;

exports.getRequiredVersionFromDescriptionFile = (data, packageName) => {
	if (
		data.optionalDependencies &&
		typeof data.optionalDependencies === "object" &&
		packageName in data.optionalDependencies
	) {
		return data.optionalDependencies[packageName];
	}
	if (
		data.dependencies &&
		typeof data.dependencies === "object" &&
		packageName in data.dependencies
	) {
		return data.dependencies[packageName];
	}
	if (
		data.peerDependencies &&
		typeof data.peerDependencies === "object" &&
		packageName in data.peerDependencies
	) {
		return data.peerDependencies[packageName];
	}
	if (
		data.devDependencies &&
		typeof data.devDependencies === "object" &&
		packageName in data.devDependencies
	) {
		return data.devDependencies[packageName];
	}
};
