/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const OriginalSource = require("webpack-sources").OriginalSource;
const Module = require("./Module");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/createHash").Hash} Hash */

class RuntimeModule extends Module {
	constructor(name) {
		super("runtime");
		this.name = name;
		this.buildMeta = {};
		this.buildInfo = {};
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `runtime:${this.name}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `runtime for ${this.name}`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, false);
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		// do nothing
		// should not be called as runtime modules are added later to the compilation
		callback();
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		return new OriginalSource(
			this.generate(sourceContext),
			`webpack-runtime:///${this.name}`
		);
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return 42; // TODO
	}

	/**
	 * @abstract
	 * @param {TODO} generateContext context
	 * @returns {string} runtime code
	 */
	generate(generateContext) {
		throw new Error(
			`RuntimeModule: generate() must be overriden in subclass ${this.name}`
		);
	}
}

module.exports = RuntimeModule;
