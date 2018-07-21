/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Module = require("./Module");
const RawSource = require("webpack-sources").RawSource;

class MultiModule extends Module {

	constructor(context, dependencies, name) {
		super();
		this.context = context;
		this.dependencies = dependencies;
		this.name = name;
		this.built = false;
		this.cacheable = true;
	}

	identifier() {
		return `multi ${this.dependencies.map((d) => d.request).join(" ")}`;
	}

	readableIdentifier(requestShortener) {
		return `multi ${this.dependencies.map((d) => requestShortener.shorten(d.request)).join(" ")}`;
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		return callback();
	}

	needRebuild() {
		return false;
	}

	size() {
		return 16 + this.dependencies.length * 12;
	}

	updateHash(hash) {
		hash.update("multi module");
		hash.update(this.name || "");
		super.updateHash(hash);
	}

	source(dependencyTemplates, outputOptions) {
		const str = [];
		this.dependencies.forEach(function(dep, idx) {
			if(dep.module) {
				if(idx === this.dependencies.length - 1)
					str.push("module.exports = ");
				str.push("__webpack_require__(");
				if(outputOptions.pathinfo)
					str.push(`/*! ${dep.request} */`);
				str.push(`${JSON.stringify(dep.module.id)}`);
				str.push(")");
			} else {
				str.push("(function webpackMissingModule() { throw new Error(");
				str.push(JSON.stringify(`Cannot find module "${dep.request}"`));
				str.push("); }())");
			}
			str.push(";\n");
		}, this);
		return new RawSource(str.join(""));
	}
}

module.exports = MultiModule;
