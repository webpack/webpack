/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");

class RequestShortener {
	constructor(directory) {
		directory = directory.replace(/\\/g, "/");
		if(/[\/\\]$/.test(directory)) directory = directory.substr(0, directory.length - 1);

		if(directory) {
			const currentDirectoryRegExpString = directory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.currentDirectoryRegExp = new RegExp("^" + currentDirectoryRegExpString + "|(!)" + currentDirectoryRegExpString, "g");
		}

		const dirname = path.dirname(directory);
		const endsWithSeperator = /[\/\\]$/.test(dirname);
		const parentDirectory = endsWithSeperator ? dirname.substr(0, dirname.length - 1) : dirname;
		if(parentDirectory && parentDirectory !== directory) {
			const parentDirectoryRegExpString = parentDirectory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.parentDirectoryRegExp = new RegExp("^" + parentDirectoryRegExpString + "|(!)" + parentDirectoryRegExpString, "g");
		}

		if(__dirname.length >= 2) {
			const buildins = path.join(__dirname, "..").replace(/\\/g, "/");
			const buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
			this.buildinsAsModule = buildinsAsModule;
			const buildinsRegExpString = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.buildinsRegExp = new RegExp("^" + buildinsRegExpString + "|(!)" + buildinsRegExpString, "g");
		}

		this.nodeModulesRegExp = /\/node_modules\//g;
		this.indexJsRegExp = /\/index.js(!|\?|\(query\))/g;
	}

	shorten(request) {
		if(!request) return request;
		request = request.replace(/\\/g, "/");
		if(this.buildinsAsModule && this.buildinsRegExp)
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		if(this.currentDirectoryRegExp)
			request = request.replace(this.currentDirectoryRegExp, "!.");
		if(this.parentDirectoryRegExp)
			request = request.replace(this.parentDirectoryRegExp, "!..");
		if(!this.buildinsAsModule && this.buildinsRegExp)
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		request = request.replace(this.nodeModulesRegExp, "/~/");
		request = request.replace(this.indexJsRegExp, "$1");
		return request.replace(/^!|!$/, "");
	}
}

module.exports = RequestShortener;
