/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { dirname, join } = require("./fs");

/** @import { InputFileSystem } from "./fs" */

/** @typedef {[string, string]} CaseCorrection wrongly cased segment paired with its real name */
/** @typedef {{ corrections: CaseCorrection[], path: string }} CaseMismatch */

/** Bounds the walk for a path pointing far outside any existing directory. */
const MAX_MISSING_SEGMENTS = 20;

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} absolutePath absolute path
 * @returns {string} the last segment of the path, or an empty string at the root
 */
const basename = (fs, absolutePath) => {
	const parent = dirname(fs, absolutePath);
	if (parent === absolutePath) return "";
	let start = parent.length;
	const charCode = absolutePath.charCodeAt(start);
	if (charCode === 47 /* "/" */ || charCode === 92 /* "\\" */) start++;
	return absolutePath.slice(start);
};

/**
 * Finds an existing path that differs from `missingPath` only in the casing of
 * its segments, by listing the directories the path walks through.
 * @param {InputFileSystem} fs input file system
 * @param {string} missingPath absolute path that does not exist
 * @param {(mismatch?: CaseMismatch) => void} callback receives the real path and the wrongly cased segments, outermost first, or nothing when the path does not exist under any casing
 * @returns {void}
 */
const findCaseMismatch = (fs, missingPath, callback) => {
	/** @type {string[]} */
	const segments = [];
	/** @type {CaseCorrection[]} */
	const corrections = [];

	/**
	 * @param {string} directory existing directory the remaining segments start from
	 * @param {string[]} entries its entries
	 * @param {number} index index into `segments`
	 * @returns {void}
	 */
	const walkDown = (directory, entries, index) => {
		const name = segments[index];
		let realName = name;
		if (!entries.includes(name)) {
			const lowerCasedName = name.toLowerCase();
			const matches = entries.filter((e) => e.toLowerCase() === lowerCasedName);
			// More than one match means the real name is not knowable from the request alone
			if (matches.length !== 1) return callback();
			realName = matches[0];
			corrections.push([name, realName]);
		}
		const next = join(fs, directory, realName);
		if (index === segments.length - 1) {
			return callback(
				corrections.length > 0 ? { corrections, path: next } : undefined
			);
		}
		fs.readdir(next, (err, nextEntries) => {
			if (err || !nextEntries) return callback();
			walkDown(next, /** @type {string[]} */ (nextEntries), index + 1);
		});
	};

	let current = missingPath;

	/**
	 * @returns {void}
	 */
	const walkUp = () => {
		const parent = dirname(fs, current);
		const name = basename(fs, current);
		if (parent === current || name === "") return callback();
		segments.push(name);
		if (segments.length > MAX_MISSING_SEGMENTS) return callback();
		fs.readdir(parent, (err, entries) => {
			if (err || !entries) {
				current = parent;
				return walkUp();
			}
			segments.reverse();
			walkDown(parent, /** @type {string[]} */ (entries), 0);
		});
	};

	walkUp();
};

/**
 * Rewrites a request with the real casing found on disk. Corrections are
 * case-only, so each one keeps the length and position of what it replaces —
 * a request that omitted the extension spells a prefix of the segment.
 * @param {string} request request as written
 * @param {CaseCorrection[]} corrections corrections, outermost first
 * @returns {string | undefined} the corrected request, or undefined when a correction is not spelled out in the request
 */
const applyCaseCorrections = (request, corrections) => {
	let result = request;
	let cursor = 0;
	for (const [wrongName, realName] of corrections) {
		let index = result.indexOf(wrongName, cursor);
		let length = wrongName.length;
		if (index === -1) {
			length = 0;
			for (let i = wrongName.length - 1; i > 0; i--) {
				// A prefix that is already correctly cased identifies nothing — the
				// request would come back unchanged and the hint would repeat it
				if (
					result.endsWith(wrongName.slice(0, i)) &&
					realName.slice(0, i) !== wrongName.slice(0, i)
				) {
					index = result.length - i;
					length = i;
					break;
				}
			}
			if (length === 0) return undefined;
		}
		result =
			result.slice(0, index) +
			realName.slice(0, length) +
			result.slice(index + length);
		cursor = index + length;
	}
	return result;
};

module.exports.applyCaseCorrections = applyCaseCorrections;
module.exports.findCaseMismatch = findCaseMismatch;
