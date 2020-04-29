/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { OriginalSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const RemoteOverrideDependency = require("./RemoteOverrideDependency");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

const TYPES = new Set(["javascript"]);

class RemoteOverrideModule extends Module {
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
		this.addDependency(new RemoteToExternalDependency(this.request));

		for (const [, value] of this.overrides) {
			const block = new AsyncDependenciesBlock({});
			const dep = new RemoteOverrideDependency(value);
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
			`var external = __webpack_require__(${JSON.stringify(
				externalModuleId
			)});`,
			"external.override(Object.assign({",
			Template.indent(
				this.overrides
					.map(([key, value]) => {
						const block = this.blocks[i++];
						const dep = block.dependencies[0];
						const module = moduleGraph.getModule(dep);
						return `${JSON.stringify(key)}: ${runtimeTemplate.basicFunction(
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
					.join(",\n")
			),
			`}, ${RuntimeGlobals.overrides}));`,
			"module.exports = external;"
		]);
		const sources = new Map();
		sources.set(
			"javascript",
			new OriginalSource(source, `webpack/remote-overrides ${this.request}`)
		);
		return { sources, runtimeRequirements };
	}

	serialize(context) {
		const { write } = context;
		write(this.request);
		write(this.overrides);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.request = read();
		this.overrides = read();
		super.deserialize(context);
	}
}

makeSerializable(
	RemoteOverrideModule,
	"webpack/lib/container/RemoteOverrideModule"
);

module.exports = RemoteOverrideModule;
