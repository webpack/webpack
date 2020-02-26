/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const OverridableOriginalDependency = require("./OverridableOriginalDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

const TYPES = new Set(["overridable"]);

class OverridableModule extends Module {
	/**
	 * @param {Module} originalModule original module
	 * @param {string} name global overridable name
	 */
	constructor(originalModule, name) {
		super("overridable-module", originalModule.context);
		this.originalModule = originalModule;
		this.name = name;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `overridable|${this.name}|${this.originalModule.identifier()}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `overridable ${
			this.name
		} -> ${this.originalModule.readableIdentifier(requestShortener)}`;
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
		const block = new AsyncDependenciesBlock({});
		const dep = new OverridableOriginalDependency(this.originalModule);
		block.addDependency(dep);
		this.addBlock(block);
		callback();
	}

	/**
	 * @returns {Set<string>} types availiable (do not mutate)
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
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		this.originalModule =
			/** @type {OverridableModule} */ (module).originalModule;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.name);
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
		const originalModule = moduleGraph.getModule(originalDep);
		const ensureChunk = runtimeTemplate.blockPromise({
			block: originalBlock,
			message: "",
			chunkGraph,
			runtimeRequirements
		});
		const sources = new Map();
		sources.set(
			"overridable",
			new RawSource(
				Template.asString([
					`return ${ensureChunk}.then(${runtimeTemplate.returningFunction(
						runtimeTemplate.returningFunction(
							runtimeTemplate.moduleRaw({
								module: originalModule,
								chunkGraph,
								request: "",
								runtimeRequirements
							})
						)
					)})`
				])
			)
		);
		return {
			runtimeRequirements,
			sources
		};
	}

	serialize(context) {
		context.write(this.name);
		super.serialize(context);
	}

	deserialize(context) {
		this.name = context.read();
		super.deserialize(context);
	}
}

makeSerializable(OverridableModule, "webpack/lib/container/OverridableModule");

module.exports = OverridableModule;
