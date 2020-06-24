/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Range, SemVer, Comparator } = require("semver");
const { join, dirname, readJson } = require("../util/fs");

/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

/**
 * @param {string} range version range as string
 * @returns {(number|string)[]} version range as array
 */
exports.parseRequiredVersion = range => {
	// Shortcut a common simple case
	if (range === "*" || range === "x" || range === "X") {
		return [];
	}

	let r = new Range(range);

	if (r.set.length !== 1) {
		throw new Error(
			`Cannot handle version range ${range}: contains more than one clause`
		);
	}

	let s = r.set[0];

	if (s.length === 1) {
		let v = s[0].semver;

		if (v === Comparator.ANY) {
			return [];
		}

		if (!(v.prerelease.length === 0)) {
			throw new Error(
				`Cannot handle version range ${range}: includes prerelease`
			);
		}

		if (s[0].operator === "") {
			return [`${v.major}`, `${v.minor}`, `${v.patch}`];
		} else if (s[0].operator === ">=") {
			return [v.major, v.minor, v.patch];
		}
	}

	if (
		!(
			s.length === 2 &&
			(s[0].operator === ">=" || s[0].semver === Comparator.ANY) &&
			s[1].operator === "<"
		)
	) {
		// TODO: is the order fixed, or could s[0] be '<' and s[1] be '>='?
		throw new Error(
			`Cannot handle version range ${range}: simplifies to more complex than one simple range`
		);
	}

	// For the range '0', the lower end is given by an ANY symbol instead of 0.0.0.
	let v1 = s[0].semver === Comparator.ANY ? new SemVer("0.0.0") : s[0].semver;
	let v2 = s[1].semver;

	if (
		!(
			v1.prerelease.length === 0 &&
			v2.prerelease.length === 1 &&
			v2.prerelease[0] === 0
		)
	) {
		throw new Error(
			`Cannot handle version range ${range}: each end of the range is not simple enough`
		);
	}

	// Go through major, minor, patch. If they are the same, then append them as strings. The first time they are not the same, the upper must be one more than the lower. Ever after, the upper must be zero.
	let result = [];
	let exact = true;

	for (let level of ["major", "minor", "patch"]) {
		if (exact === true) {
			if (v1[level] === v2[level]) {
				result.push(`${v1[level]}`);
			} else if (v1[level] + 1 === v2[level]) {
				// The level increments by exactly 1, so this level must be the same
				result.push(`${v1[level]}`);
				exact = false;
			} else {
				throw new Error(
					`Cannot handle version range ${range}: exact levels do not match up`
				);
			}
		} else {
			if (v2[level] === 0) {
				result.push(v1[level]);
			} else {
				throw new Error(
					`Cannot handle version range ${range}: fuzzy levels do not match up`
				);
			}
		}
	}
	return result;
};

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
// exports.parseRequiredVersion = version => {
// 	if (version === "*") return [];
// 	let fuzzyStart = Infinity;
// 	if (version.startsWith(">=")) {
// 		fuzzyStart = 0;
// 		version = version.slice(2);
// 	} else if (version.startsWith("^")) {
// 		fuzzyStart = 1;
// 		version = version.slice(1);
// 	} else if (version.startsWith("~")) {
// 		fuzzyStart = 2;
// 		version = version.slice(1);
// 	}
// 	return version
// 		.split(".")
// 		.map((x, i) => (i >= fuzzyStart && `${+x}` === x ? +x : x));
// };

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
exports.parseVersion = version => {
	let v = new SemVer(version);
	return [v.major, v.minor, v.patch, ...v.prerelease];
};

/**
 * @param {(number|string)[]} version version
 * @returns {string} version as string
 */
exports.versionToString = version => {
	if (!version) return "(unknown)";
	if (version.length === 0) return "*";
	return JSON.stringify(version);
};

// /**
//  * @param {(number|string)[]} version version
//  * @returns {string} version as string
//  */
// exports.versionToString = version => {
// 	if (!version) return "(unknown)";
// 	if (version.length === 0) return "*";
// 	const info = version.map(value =>
// 		typeof value !== "string"
// 			? {
// 					type: "min",
// 					value: `${value}`
// 			  }
// 			: `${+value}` === value
// 			? {
// 					type: "exact",
// 					value
// 			  }
// 			: {
// 					type: "tag",
// 					value
// 			  }
// 	);
// 	switch (`${info[0].type}.${info.length > 1 ? info[1].type : "undefined"}`) {
// 		case "exact.min":
// 		case "tag.min":
// 			if (!info.slice(2).some(i => i.type === "exact"))
// 				return `^${version.join(".")}`;
// 			break;

// 		case "exact.exact":
// 		case "exact.tag":
// 		case "tag.exact":
// 		case "tag.tag":
// 			if (!info.slice(2).some(i => i.type === "exact"))
// 				return `~${version.join(".")}`;
// 			else if (!info.slice(2).some(i => i.type === "min"))
// 				return version.join(".");
// 			break;

// 		case "min.min":
// 		case "min.tag":
// 			if (!info.slice(2).some(i => i.type === "exact"))
// 				return `>=${version.join(".")}`;
// 			break;

// 		case "min.undefined":
// 			return `>=${version.join(".")}`;

// 		case "exact.undefined":
// 		case "tag.undefined":
// 			return version.join(".");
// 	}
// 	return info
// 		.map(i => (i.type === "exact" ? i.value : `[>=${i.value}]`))
// 		.join(".");
// };

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
