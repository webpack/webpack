/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const Module = require("./Module");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/createHash").Hash} Hash */

module.exports = class RawModule extends Module {
	constructor(source, identifier, readableIdentifier) {
		super("javascript/dynamic", null);
		this.sourceStr = source;
		this.identifierStr = identifier || this.sourceStr;
		this.readableIdentifierStr = readableIdentifier || this.identifierStr;
		this.built = false;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this.identifierStr;
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return this.sourceStr.length;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.readableIdentifierStr);
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
		this.buildInfo = {
			cacheable: true
		};
		callback();
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		if (this.useSourceMap) {
			return new OriginalSource(this.sourceStr, this.identifier());
		} else {
			return new RawSource(this.sourceStr);
		}
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {Compilation} compilation the compilation
	 * @returns {void}
	 */
	updateHash(hash, compilation) {
		hash.update(this.sourceStr);
		super.updateHash(hash, compilation);
	}
};
