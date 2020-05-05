/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const OverridableDependenciesBlock = require("./OverridableDependenciesBlock");
const OverridableOriginalDependency = require("./OverridableOriginalDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
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

const TYPES = new Set(["overridable"]);

class OverridableModule extends Module {
	/**
	 * @param {string} context context
	 * @param {string} originalRequest original request
	 * @param {string} name global overridable name
	 */
	constructor(context, originalRequest, name) {
		super("overridable-module", context);
		this.originalRequest = originalRequest;
		this.name = name;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `overridable|${this.name}|${this.context}|${this.originalRequest}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `overridable ${this.name} -> ${this.originalRequest}`;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `webpack/container/overridable/${this.name}=${this.originalRequest}`;
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
		this.buildInfo = {};
		const block = new OverridableDependenciesBlock();
		const dep = new OverridableOriginalDependency(this.originalRequest);
		block.addDependency(dep);
		this.addBlock(block);
		callback();
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.name);
		hash.update(this.originalRequest);
		super.updateHash(hash, chunkGraph);
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ chunkGraph, moduleGraph, runtimeTemplate }) {
		const runtimeRequirements = new Set([RuntimeGlobals.overrides]);
		const originalBlock = this.blocks[0];
		const originalDep = originalBlock.dependencies[0];
		const originalRequest = moduleGraph.getModule(originalDep);
		const ensureChunk = runtimeTemplate.blockPromise({
			block: originalBlock,
			message: "",
			chunkGraph,
			runtimeRequirements
		});
		const factory = runtimeTemplate.returningFunction(
			runtimeTemplate.moduleRaw({
				module: originalRequest,
				chunkGraph,
				request: "",
				runtimeRequirements
			})
		);
		const sources = new Map();
		sources.set(
			"overridable",
			new RawSource(
				Template.asString([
					ensureChunk.startsWith("Promise.resolve(")
						? `return ${factory};`
						: `return ${ensureChunk}.then(${runtimeTemplate.returningFunction(
								factory
						  )});`
				])
			)
		);
		return {
			runtimeRequirements,
			sources
		};
	}

	serialize(context) {
		const { write } = context;
		write(this.originalRequest);
		write(this.name);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.originalRequest = read();
		this.name = read();
		super.deserialize(context);
	}
}

makeSerializable(OverridableModule, "webpack/lib/container/OverridableModule");

module.exports = OverridableModule;
