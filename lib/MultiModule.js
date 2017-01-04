"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const RawSource = require("webpack-sources").RawSource;
const Module = require("./Module");
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
		return `multi ${this.name}`;
	}

	readableIdentifier() {
		return `multi ${this.name}`;
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		return callback();
	}

	source(dependencyTemplates, outputOptions) {
		const str = [];
		this.dependencies.forEach(function(dep, idx) {
			if(dep.module) {
				if(idx === this.dependencies.length - 1) {
					str.push("module.exports = ");
				}
				str.push("__webpack_require__(");
				if(outputOptions.pathinfo) {
					str.push(`/*! ${dep.request} */`);
				}
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
}
module.exports = MultiModule;
