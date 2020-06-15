/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { join, dirname, readJson } = require("../util/fs");

/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
exports.parseRequiredVersion = version => {
	if (version === "*") return [];
	let fuzzyStart = Infinity;
	if (version.startsWith(">=")) {
		fuzzyStart = 0;
		version = version.slice(2);
	} else if (version.startsWith("^")) {
		fuzzyStart = 1;
		version = version.slice(1);
	} else if (version.startsWith("~")) {
		fuzzyStart = 2;
		version = version.slice(1);
	}
	return version
		.split(".")
		.map((x, i) => (i >= fuzzyStart && `${+x}` === x ? +x : x));
};

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
exports.parseVersion = version => {
	return version.split(".").map(x => (`${+x}` === x ? +x : x));
};

/**
 * @param {(number|string)[]} version version
 * @returns {string} version as string
 */
exports.versionToString = version => {
	if (!version) return "(unknown)";
	if (version.length === 0) return "*";
	const info = version.map(value =>
		typeof value !== "string"
			? {
					type: "min",
					value: `${value}`
			  }
			: `${+value}` === value
			? {
					type: "exact",
					value
			  }
			: {
					type: "tag",
					value
			  }
	);
	switch (`${info[0].type}.${info.length > 1 ? info[1].type : "undefined"}`) {
		case "exact.min":
		case "tag.min":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `^${version.join(".")}`;
			break;

		case "exact.exact":
		case "exact.tag":
		case "tag.exact":
		case "tag.tag":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `~${version.join(".")}`;
			else if (!info.slice(2).some(i => i.type === "min"))
				return version.join(".");
			break;

		case "min.min":
		case "min.tag":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `>=${version.join(".")}`;
			break;

		case "min.undefined":
			return `>=${version.join(".")}`;

		case "exact.undefined":
		case "tag.undefined":
			return version.join(".");
	}
	return info
		.map(i => (i.type === "exact" ? i.value : `[>=${i.value}]`))
		.join(".");
};

/**
 * @param {string} str maybe required version
 * @returns {boolean} true, if it looks like a version
 */
exports.isRequiredVersion = str => {
	if (str === "*") return true;
	if (/&&|\|\|/.test(str)) return false;
	if (str.startsWith("^")) return true;
	if (str.startsWith("~")) return true;
	if (str.startsWith(">=")) return true;
	return /^\d/.test(str);
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
