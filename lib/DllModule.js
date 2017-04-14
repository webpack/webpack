/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const Module = require("./Module");
const RawSource = require("webpack-sources").RawSource;

class DllModule extends Module {
	constructor(context, dependencies, name, type) {
		super();
		this.context = context;
		this.dependencies = dependencies;
		this.name = name;
		this.built = false;
		this.cacheable = true;
		this.type = type;
	}

	identifier() {
		return `dll ${this.name}`;
	}

	readableIdentifier() {
		return `dll ${this.name}`;
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		return callback();
	}

	source() {
		return new RawSource("module.exports = __webpack_require__;");
	}

	needRebuild() {
		return false;
	}

	size() {
		return 12;
	}

	updateHash(hash) {
		hash.update("dll module");
		hash.update(this.name || "");
		super.updateHash(hash);
	}
}

module.exports = DllModule;
