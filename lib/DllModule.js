/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("./Module");

/** @typedef {import("./util/createHash").Hash} Hash */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("webpack-sources").Source} Source */

class DllModule extends Module {
	constructor(context, dependencies, name, type) {
		super("javascript/dynamic", context);

		// Info from Factory
		this.dependencies = dependencies;
		this.name = name;
		this.type = type;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `dll ${this.name}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `dll ${this.name}`;
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
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {string=} type the type of source that should be returned
	 * @returns {Source} generated source
	 */
	source(dependencyTemplates, runtimeTemplate, type) {
		return new RawSource("module.exports = __webpack_require__;");
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
		return 12;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("dll module");
		hash.update(this.name || "");
		super.updateHash(hash);
	}
}

module.exports = DllModule;
