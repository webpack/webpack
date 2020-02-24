/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");
const Template = require("../Template");

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

const TYPES = new Set(["javascript"]);

class RemoteModule extends Module {
	constructor(request, overrides) {
		super("remote-override-module");
		this.request = request;
		this.overrides = overrides;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `remote override ${this.request}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `remote override ${this.request}`;
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
		this.addDependency(new RemoteToExternalDependency(this.request));

		for (const [, value] of this.overrides) {
			const block = new AsyncDependenciesBlock({});
			const dep = new RemoteToExternalDependency(value);
			block.addDependency(dep);
			this.addBlock(block);
		}

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

	size(type) {
		return 42;
	}

	/**
	 * @returns {Set<string>} types availiable (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return this.request;
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const runtimeRequirements = new Set([RuntimeGlobals.module]);
		const externalDep = this.dependencies[0];
		const externalModule = moduleGraph.getModule(externalDep);
		const externalModuleId = chunkGraph.getModuleId(externalModule);
		let i = 0;
		const source = Template.asString([
			`var external = __webpack_require__(${externalModuleId});`,
			"var overrides = {};",
			Template.asString(
				this.overrides.map(([key, value]) => {
					const block = this.blocks[i++];
					const dep = block.dependencies[0];
					const module = moduleGraph.getModule(dep);
					return `overrides[${JSON.stringify(
						key
					)}] = ${runtimeTemplate.basicFunction(
						"",
						`return ${runtimeTemplate.blockPromise({
							block,
							message: "",
							chunkGraph,
							runtimeRequirements
						})}.then(${runtimeTemplate.basicFunction(
							"",
							`return ${runtimeTemplate.returningFunction(
								runtimeTemplate.moduleRaw({
									module,
									chunkGraph,
									request: "",
									runtimeRequirements
								})
							)}`
						)})`
					)}`;
				})
			),
			"external.override(overrides);",
			"module.exports = external;"
		]);
		const sources = new Map();
		sources.set("javascript", new RawSource(source));
		return { sources, runtimeRequirements };
	}
}

module.exports = RemoteModule;
