/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;

module.exports = class RawModule extends Module {

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

	size() {
		return this.sourceStr.length;
	}

	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.readableIdentifierStr);
	}

	needRebuild() {
		return false;
	}

	build(options, compilations, resolver, fs, callback) {
		this.builtTime = Date.now();
		callback();
	}

	source() {
		if(this.useSourceMap)
			return new OriginalSource(this.sourceStr, this.identifier());
		else
			return new RawSource(this.sourceStr);
	}

	updateHash(hash) {
		hash.update(this.sourceStr);
		super.updateHash(hash);
	}
};
