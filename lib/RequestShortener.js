/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const NORMALIZE_SLASH_DIRECTION_REGEXP = /\\/g;
const PATH_CHARS_REGEXP = /[-[\]{}()*+?.,\\^$|#\s]/g;
const SEPARATOR_REGEXP = /[/\\]$/;
const FRONT_OR_BACK_BANG_REGEXP = /^!|!$/g;
const INDEX_JS_REGEXP = /\/index.js(!|\?|\(query\))/g;

const normalizeBackSlashDirection = (request) => {
	return request.replace(NORMALIZE_SLASH_DIRECTION_REGEXP, "/");
};

const createRegExpForPath = (path) => {
	const regexpTypePartial = path.replace(PATH_CHARS_REGEXP, "\\$&");
	return new RegExp(`(^|!)${regexpTypePartial}`, "g");
};

class RequestShortener {
	constructor(directory) {
		directory = normalizeBackSlashDirection(directory);
		if(SEPARATOR_REGEXP.test(directory)) directory = directory.substr(0, directory.length - 1);

		if(directory) {
			this.currentDirectoryRegExp = createRegExpForPath(directory);
		}

		const dirname = path.dirname(directory);
		const endsWithSeperator = SEPARATOR_REGEXP.test(dirname);
		const parentDirectory = endsWithSeperator ? dirname.substr(0, dirname.length - 1) : dirname;
		if(parentDirectory && parentDirectory !== directory) {
			this.parentDirectoryRegExp = createRegExpForPath(parentDirectory);
		}

		if(__dirname.length >= 2) {
			const buildins = normalizeBackSlashDirection(path.join(__dirname, ".."));
			const buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
			this.buildinsAsModule = buildinsAsModule;
			this.buildinsRegExp = createRegExpForPath(buildins);
		}
	}

	shorten(request) {
		if(!request) return request;
		request = normalizeBackSlashDirection(request);
		if(this.buildinsAsModule && this.buildinsRegExp)
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		if(this.currentDirectoryRegExp)
			request = request.replace(this.currentDirectoryRegExp, "!.");
		if(this.parentDirectoryRegExp)
			request = request.replace(this.parentDirectoryRegExp, "!..");
		if(!this.buildinsAsModule && this.buildinsRegExp)
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		request = request.replace(INDEX_JS_REGEXP, "$1");
		return request.replace(FRONT_OR_BACK_BANG_REGEXP, "");
	}
}

module.exports = RequestShortener;
