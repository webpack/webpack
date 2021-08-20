/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { join, dirname, readJson } = require("../util/fs");

/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

const RE_URL_DEP_VERSION =
	/^git(?:\+(?:ssh|https?|file))?:\/\/.+#(?:semver:)?(.+)/;

/**
 * @see https://docs.npmjs.com/cli/v7/configuring-npm/package-json#urls-as-dependencies
 * @param {string} version version to be normalized
 * @returns {string} normalized version
 */
function normalizeVersion(version) {
	/**
	 * for some URL Dependencies
	 * git+ssh://git@github.com:npm/cli.git#v1.0.27
	 * git+ssh://git@github.com:npm/cli#semver:^5.0
	 * git://github.com/npm/cli.git#v1.0.27
	 */
	const match = version.match(RE_URL_DEP_VERSION);

	return (match && match[1]) || version;
}

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
 * @param {function(Error=, {data: object, path: string}=): void} callback callback
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
		return normalizeVersion(data.optionalDependencies[packageName]);
	}
	if (
		data.dependencies &&
		typeof data.dependencies === "object" &&
		packageName in data.dependencies
	) {
		return normalizeVersion(data.dependencies[packageName]);
	}
	if (
		data.peerDependencies &&
		typeof data.peerDependencies === "object" &&
		packageName in data.peerDependencies
	) {
		return normalizeVersion(data.peerDependencies[packageName]);
	}
	if (
		data.devDependencies &&
		typeof data.devDependencies === "object" &&
		packageName in data.devDependencies
	) {
		return normalizeVersion(data.devDependencies[packageName]);
	}
};
