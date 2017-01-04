"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
const Module = require("./Module");
class RawModule extends Module {
	constructor(source, identifier, readableIdentifier) {
		super();
		this.sourceStr = source;
		this.identifierStr = identifier || this.sourceStr;
		this.readableIdentifierStr = readableIdentifier || this.identifierStr;
		this.cacheable = true;
		this.built = false;
	}

	identifier() {
		return this.identifierStr;
	}

	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.readableIdentifierStr);
	}

	build(options, compilation, resolver, fs, callback) {
		this.builtTime = new Date().getTime();
		callback();
	}

	source() {
		if(this.useSourceMap) {
			return new webpackSources.OriginalSource(this.sourceStr, this.identifier());
		} else {
			return new webpackSources.RawSource(this.sourceStr);
		}
	}

	size() {
		return this.sourceStr.length;
	}

	needRebuild() {
		return false;
	}
}
module.exports = RawModule;
