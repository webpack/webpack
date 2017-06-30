/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const NORMALIZE_SLASH_DIRECTION_REGEXP = /\\/g;
const PATH_CHARS_REGEXP = /[-[\]{}()*+?.,\\^$|#\s]/g;
const SEPERATOR_REGEXP = /[\/\\]$/;


const normalizeBackSlashDirection = (request) => {
	return request.replace(NORMALIZE_SLASH_DIRECTION_REGEXP, "/");
};

const shortenPath = (path) => {
	return path.replace(PATH_CHARS_REGEXP, "\\$&");
};


class RequestShortener {
	constructor(directory) {
		directory = normalizeBackSlashDirection(directory);
		if(/[\/\\]$/.test(directory)) directory = directory.substr(0, directory.length - 1);

		if(directory) {
			const currentDirectoryRegExpString = shortenPath(directory);
			this.currentDirectoryRegExp = new RegExp("^" + currentDirectoryRegExpString + "|(!)" + currentDirectoryRegExpString, "g");
		}

		const dirname = path.dirname(directory);
		const endsWithSeperator = SEPERATOR_REGEXP.test(dirname);
		const parentDirectory = endsWithSeperator ? dirname.substr(0, dirname.length - 1) : dirname;
		if(parentDirectory && parentDirectory !== directory) {
			const parentDirectoryRegExpString = shortenPath(parentDirectory);
			this.parentDirectoryRegExp = new RegExp("^" + parentDirectoryRegExpString + "|(!)" + parentDirectoryRegExpString, "g");
		}

		if(__dirname.length >= 2) {
			const buildins = normalizeBackSlashDirection(path.join(__dirname, ".."));
			const buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
			this.buildinsAsModule = buildinsAsModule;
			const buildinsRegExpString = shortenPath(buildins);
			this.buildinsRegExp = new RegExp("^" + buildinsRegExpString + "|(!)" + buildinsRegExpString, "g");
		}

		this.indexJsRegExp = /\/index.js(!|\?|\(query\))/g;
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
		request = request.replace(this.indexJsRegExp, "$1");
		return request.replace(/^!|!$/, "");
	}
}

module.exports = RequestShortener;
