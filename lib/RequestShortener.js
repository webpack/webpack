"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const path = require("path");
class RequestShortener {
	constructor(directory) {
		directory = directory.replace(/\\/g, "/");
		let parentDirectory = path.dirname(directory);
		if(/[\/\\]$/.test(directory)) {
			directory = directory.substr(0, directory.length - 1);
		}
		if(directory) {
			const currentDirectoryRegExp = directory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.currentDirectoryRegExp = new RegExp(`^${currentDirectoryRegExp}|(!)${currentDirectoryRegExp}`, "g");
		}
		if(/[\/\\]$/.test(parentDirectory)) {
			parentDirectory = parentDirectory.substr(0, parentDirectory.length - 1);
		}
		if(parentDirectory && parentDirectory !== directory) {
			const parentDirectoryRegExp = parentDirectory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.parentDirectoryRegExp = new RegExp(`^${parentDirectoryRegExp}|(!)${parentDirectoryRegExp}`, "g");
		}
		if(__dirname.length >= 2) {
			const buildins = path.join(__dirname, "..").replace(/\\/g, "/");
			const buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
			const buildinsRegExp = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			this.buildinsAsModule = buildinsAsModule;
			this.buildinsRegExp = new RegExp(`^${buildinsRegExp}|(!)${buildinsRegExp}`, "g");
		}
		this.nodeModulesRegExp = /\/node_modules\//g;
		this.indexJsRegExp = /\/index.js(!|\?|\(query\))/g;
	}

	shorten(request) {
		if(!request) {
			return request;
		}
		request = request.replace(/\\/g, "/");
		if(this.buildinsAsModule && this.buildinsRegExp) {
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		}
		if(this.currentDirectoryRegExp) {
			request = request.replace(this.currentDirectoryRegExp, "!.");
		}
		if(this.parentDirectoryRegExp) {
			request = request.replace(this.parentDirectoryRegExp, "!..");
		}
		if(!this.buildinsAsModule && this.buildinsRegExp) {
			request = request.replace(this.buildinsRegExp, "!(webpack)");
		}
		request = request.replace(this.nodeModulesRegExp, "/~/");
		request = request.replace(this.indexJsRegExp, "$1");
		return request.replace(/^!|!$/, "");
	}
}
module.exports = RequestShortener;
