/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ProvidedDependency = require("./ProvidedDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {Object} OverrideOptions
 * @property {string} import request to new module
 */

const TYPES = new Set(["share-init"]);

class ProvideModule extends Module {
	/**
	 * @param {string} shareScope shared scope name
	 * @param {string} name shared key
	 * @param {(string | number)[]} version version
	 * @param {string} request request to the provided module
	 */
	constructor(shareScope, name, version, request) {
		super("provide-module");
		this._shareScope = shareScope;
		this._name = name;
		this._version = version;
		this._request = request;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `provide module (${this._shareScope}) ${this._name}@${this._version} = ${this._request}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `provide module (${this._shareScope}) ${this._name}@${this._version} = ${this._request}`;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `webpack/sharing/provide/${this._shareScope}/${this._name}`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(null, !this.buildInfo);
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
		this.buildMeta = {};
		this.buildInfo = {
			strict: true
		};

		this.clearDependenciesAndBlocks();
		const block = new AsyncDependenciesBlock({});
		const dep = new ProvidedDependency(this._request);
		block.addDependency(dep);
		this.addBlock(block);

		callback();
	}

	/**
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk, { chunkGraph }) {
		return chunkGraph.getNumberOfEntryModules(chunk) > 0;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
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
	codeGeneration({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const runtimeRequirements = new Set([RuntimeGlobals.initializeSharing]);
		const code = `register(${JSON.stringify(this._name)}, ${JSON.stringify(
			this._version || 0
		)}, ${runtimeTemplate.asyncModuleFactory({
			block: this.blocks[0],
			chunkGraph,
			request: this._request,
			runtimeRequirements
		})});`;
		const sources = new Map();
		const data = new Map();
		data.set("share-init", [
			{
				shareScope: this._shareScope,
				init: code
			}
		]);
		return { sources, data, runtimeRequirements };
	}

	serialize(context) {
		const { write } = context;
		write(this._shareScope);
		write(this._name);
		write(this._version);
		write(this._request);
		super.serialize(context);
	}

	static deserialize(context) {
		const { read } = context;
		const obj = new ProvideModule(read(), read(), read(), read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(ProvideModule, "webpack/lib/sharing/ProvideModule");

module.exports = ProvideModule;
