/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");

class RequestShortener {
	constructor(directory) {
		directory = directory.replace(/\\/g, "/");
		let parentDirectory = path.dirname(directory);
		if(/[\/\\]$/.test(directory)) directory = directory.substr(0, directory.length - 1);

		if(directory) {
			let currentDirectoryRegExp = directory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			currentDirectoryRegExp = new RegExp("^" + currentDirectoryRegExp + "|(!)" + currentDirectoryRegExp, "g");
			this.currentDirectoryRegExp = currentDirectoryRegExp;
		}

		if(/[\/\\]$/.test(parentDirectory)) parentDirectory = parentDirectory.substr(0, parentDirectory.length - 1);
		if(parentDirectory && parentDirectory !== directory) {
			let parentDirectoryRegExp = parentDirectory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			parentDirectoryRegExp = new RegExp("^" + parentDirectoryRegExp + "|(!)" + parentDirectoryRegExp, "g");
			this.parentDirectoryRegExp = parentDirectoryRegExp;
		}

		if(__dirname.length >= 2) {
			let buildins = path.join(__dirname, "..").replace(/\\/g, "/");
			let buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
			let buildinsRegExp = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			buildinsRegExp = new RegExp("^" + buildinsRegExp + "|(!)" + buildinsRegExp, "g");
			this.buildinsAsModule = buildinsAsModule;
			this.buildinsRegExp = buildinsRegExp;
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
