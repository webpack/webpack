/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const OriginalSource = require("webpack-sources").OriginalSource;
const Module = require("./Module");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const TYPES = new Set(["runtime"]);

class RuntimeModule extends Module {
	/**
	 * @param {string} name a readable name
	 * @param {number=} stage an optional stage
	 */
	constructor(name, stage = 0) {
		super("runtime");
		this.name = name;
		this.stage = stage;
		this.buildMeta = {};
		this.buildInfo = {};
		/** @type {Compilation} */
		this.compilation = undefined;
		/** @type {Chunk} */
		this.chunk = undefined;
		this.fullHash = false;
		/** @type {string} */
		this._cachedGeneratedCode = undefined;
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @param {Chunk} chunk the chunk
	 * @returns {void}
	 */
	attach(compilation, chunk) {
		this.compilation = compilation;
		this.chunk = chunk;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `webpack/runtime/${this.name}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `webpack/runtime/${this.name}`;
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
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
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
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.name);
		hash.update(`${this.stage}`);
		try {
			if (this.fullHash) {
				// Do not use getGeneratedCode here, because i. e. compilation hash might be not
				// ready at this point. We will cache it later instead.
				hash.update(this.generate());
			} else {
				hash.update(this.getGeneratedCode());
			}
		} catch (err) {
			hash.update(err.message);
		}
		super.updateHash(hash, context);
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		const sources = new Map();
		const generatedCode = this.getGeneratedCode();
		if (generatedCode) {
			sources.set(
				"runtime",
				new OriginalSource(generatedCode, this.identifier())
			);
		}
		return {
			sources,
			runtimeRequirements: null
		};
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		try {
			const source = this.getGeneratedCode();
			return source ? source.length : 0;
		} catch (e) {
			return 0;
		}
	}

	/* istanbul ignore next */
	/**
	 * @abstract
	 * @returns {string} runtime code
	 */
	generate() {
		const AbstractMethodError = require("./AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * @returns {string} runtime code
	 */
	getGeneratedCode() {
		if (this._cachedGeneratedCode) {
			return this._cachedGeneratedCode;
		}
		return (this._cachedGeneratedCode = this.generate());
	}

	/**
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return true;
	}
}

module.exports = RuntimeModule;
