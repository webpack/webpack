/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("./Module");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/createHash").Hash} Hash */

class MultiModule extends Module {
	constructor(context, dependencies, name) {
		super("javascript/dynamic", context);

		// Info from Factory
		this.dependencies = dependencies;
		this.name = name;
		this._identifier = `multi ${this.dependencies
			.map(d => d.request)
			.join(" ")}`;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `multi ${this.dependencies
			.map(d => requestShortener.shorten(d.request))
			.join(" ")}`;
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(Error=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.buildMeta = {};
		this.buildInfo = {};
		return callback();
	}

	/**
	 * @param {TODO} fileTimestamps timestamps of files
	 * @param {TODO} contextTimestamps timestamps of directories
	 * @returns {boolean} true, if the module needs a rebuild
	 */
	needRebuild(fileTimestamps, contextTimestamps) {
		return false;
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return 16 + this.dependencies.length * 12;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("multi module");
		hash.update(this.name || "");
		super.updateHash(hash);
	}

	/**
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {string=} type the type of source that should be returned
	 * @returns {Source} generated source
	 */
	source(dependencyTemplates, runtimeTemplate, type) {
		const str = [];
		let idx = 0;
		for (const dep of this.dependencies) {
			if (dep.module) {
				if (idx === this.dependencies.length - 1) {
					str.push("module.exports = ");
				}
				str.push(
					runtimeTemplate.moduleRaw({
						module: dep.module,
						request: dep.request
					})
				);
			} else {
				str.push(
					runtimeTemplate.missingModule({
						request: dep.request
					})
				);
			}
			str.push(";\n");
			idx++;
		}
		return new RawSource(str.join(""));
	}
}

module.exports = MultiModule;
