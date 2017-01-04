"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
const Module = require("./Module");
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");
class ExternalModule extends Module {
	constructor(request, type) {
		super();
		this.request = request;
		this.type = type;
		this.chunkCondition = (chunk) => chunk.hasEntryModule();
		this.built = false;
	}

	identifier() {
		return `external ${JSON.stringify(this.request)}`;
	}

	readableIdentifier() {
		return `external ${JSON.stringify(this.request)}`;
	}

	needRebuild() {
		return false;
	}

	build(options, compilation, resolver, fs, callback) {
		this.builtTime = new Date().getTime();
		callback();
	}

	source() {
		let str = "throw new Error('Externals not supported');";
		let request = this.request;
		if(typeof request === "object") {
			request = request[this.type];
		}
		switch(this.type) {
			case "this":
			case "window":
			case "global":
				// todo: it seems to be unclear about use case of array type request
				if(Array.isArray(request)) {
					str = `(function() { module.exports = ${this.type}${request.map(r => `[${JSON.stringify(r)}]`)
						.join("")}; }());`;
				} else {
					str = `(function() { module.exports = ${this.type}[${JSON.stringify(request)}]; }());`;
				}
				break;
			case "commonjs":
			case "commonjs2":
				if(Array.isArray(request)) {
					str = `module.exports = require(${JSON.stringify(request[0])})${request.slice(1)
						.map(r => `[${JSON.stringify(r)}]`)
						.join("")};`;
				} else {
					str = `module.exports = require(${JSON.stringify(request)});`;
				}
				break;
			case "amd":
			case "umd":
			case "umd2":
				str = "";
				if(this.optional) {
					str += `if(typeof __WEBPACK_EXTERNAL_MODULE_${this.id}__ === 'undefined') {${WebpackMissingModule.moduleCode(request)}}\n`;
				}
				str += `module.exports = __WEBPACK_EXTERNAL_MODULE_${this.id}__;`;
				break;
			default:
				str = "";
				if(this.optional) {
					str += `if(typeof ${request} === 'undefined') {${WebpackMissingModule.moduleCode(request)}}\n`;
				}
				str += `module.exports = ${request};`;
				break;
		}
		if(this.useSourceMap) {
			return new webpackSources.OriginalSource(str, this.identifier());
		} else {
			return new webpackSources.RawSource(str);
		}
	}

	size() {
		return 42;
	}
}
ExternalModule.prototype.external = true;
module.exports = ExternalModule;
