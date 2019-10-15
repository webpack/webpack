/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { join, dirname: fsDirname } = require("./util/fs");

const NORMALIZE_SLASH_DIRECTION_REGEXP = /\\/g;
const PATH_CHARS_REGEXP = /[-[\]{}()*+?.,\\^$|#\s]/g;
const SEPARATOR_REGEXP = /[/\\]$/;
const FRONT_OR_BACK_BANG_REGEXP = /^!|!$/g;
const INDEX_JS_REGEXP = /\/index.js(!|\?|\(query\))/g;
const MATCH_RESOURCE_REGEXP = /!=!/;

/**
 * @param {string} request the request
 * @returns {string} the normalized request
 */
const normalizeBackSlashDirection = request => {
	return request.replace(NORMALIZE_SLASH_DIRECTION_REGEXP, "/");
};

/**
 * @param {string} path the path to match
 * @returns {RegExp} the path matcher
 */
const createRegExpForPath = path => {
	const regexpTypePartial = path.replace(PATH_CHARS_REGEXP, "\\$&");
	return new RegExp(`(^|!)${regexpTypePartial}`, "g");
};

class RequestShortener {
	/**
	 * @param {string} dir the directory
	 */
	constructor(dir) {
		/** @type {RegExp | null} */
		this.currentDirectoryRegExp = null;
		/** @type {RegExp | null} */
		this.parentDirectoryRegExp = null;
		/** @type {RegExp | null} */
		this.buildinsRegExp = null;
		/** @type {boolean} */
		this.buildinsAsModule = false;

		let directory = normalizeBackSlashDirection(dir);
		if (SEPARATOR_REGEXP.test(directory)) {
			directory = directory.substr(0, directory.length - 1);
		}

		if (directory) {
			this.currentDirectoryRegExp = createRegExpForPath(directory);
		}

		const dirname = fsDirname(undefined, directory);
		const endsWithSeparator = SEPARATOR_REGEXP.test(dirname);
		const parentDirectory = endsWithSeparator
			? dirname.substr(0, dirname.length - 1)
			: dirname;

		if (parentDirectory && parentDirectory !== directory) {
			this.parentDirectoryRegExp = createRegExpForPath(`${parentDirectory}/`);
		}

		if (__dirname.length >= 2) {
			const buildins = normalizeBackSlashDirection(
				join(undefined, __dirname, "..")
			);
			const buildinsAsModule =
				this.currentDirectoryRegExp &&
				this.currentDirectoryRegExp.test(buildins);
			this.buildinsAsModule = buildinsAsModule;
			this.buildinsRegExp = createRegExpForPath(buildins);
		}

		/** @type {Map<string, string>} */
		this.cache = new Map();
	}

	/**
	 * @param {string | undefined | null} request the request to shorten
	 * @returns {string | undefined | null} the shortened request
	 */
	shorten(request) {
		if (!request) {
			return request;
		}
		const cacheEntry = this.cache.get(request);
		if (cacheEntry !== undefined) {
			return cacheEntry;
		}
		let result = normalizeBackSlashDirection(request);
		if (this.buildinsAsModule && this.buildinsRegExp) {
			result = result.replace(this.buildinsRegExp, "!(webpack)");
		}
		if (this.currentDirectoryRegExp) {
			result = result.replace(this.currentDirectoryRegExp, "!.");
		}
		if (this.parentDirectoryRegExp) {
			result = result.replace(this.parentDirectoryRegExp, "!../");
		}
		if (!this.buildinsAsModule && this.buildinsRegExp) {
			result = result.replace(this.buildinsRegExp, "!(webpack)");
		}
		result = result.replace(INDEX_JS_REGEXP, "$1");
		result = result.replace(FRONT_OR_BACK_BANG_REGEXP, "");
		result = result.replace(MATCH_RESOURCE_REGEXP, " = ");
		this.cache.set(request, result);
		return result;
	}
}

module.exports = RequestShortener;
