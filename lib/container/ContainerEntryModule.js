/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const ContainerExposedDependency = require("./ContainerExposedDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
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
/** @typedef {import("./ContainerEntryDependency")} ContainerEntryDependency */

const SOURCE_TYPES = new Set(["javascript"]);
const RUNTIME_REQUIREMENTS = new Set([
	RuntimeGlobals.definePropertyGetters,
	RuntimeGlobals.exports,
	RuntimeGlobals.returnExportsFromRuntime
]);

module.exports = class ContainerEntryModule extends Module {
	constructor(dependency) {
		super("javascript/dynamic", null);
		this.exposes = dependency.exposes;
		this.dependencies /** @type {ContainerEntryDependency[]} */ = [];
		this.blocks = [];
	}

	/**
	 * @returns {Set<string>} types availiable (do not mutate)
	 */
	getSourceTypes() {
		return SOURCE_TYPES;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `container entry ${JSON.stringify(this.exposes)}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `container entry`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, !this.buildMeta);
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

		let idx = -1;
		for (const [name, request] of Object.entries(this.exposes)) {
			++idx;
			const dep = new ContainerExposedDependency(name, request);
			dep.loc = {
				name,
				index: idx
			};

			this.dependencies.push(dep);
		}

		for (const dep of this.dependencies) {
			const block = new AsyncDependenciesBlock(
				undefined,
				dep.loc,
				dep.userRequest
			);
			block.addDependency(dep);
			this.addBlock(block);
		}

		callback();
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ moduleGraph, chunkGraph, runtimeTemplate }) {
		const sources = new Map();
		const runtimeRequirements = RUNTIME_REQUIREMENTS;
		const getters = [];

		for (const block of this.blocks) {
			const {
				dependencies: [dep]
			} = block;
			const name = dep.exposedName;
			const mod = moduleGraph.getModule(dep);
			const request = dep.userRequest;

			let str;

			if (!mod) {
				str = runtimeTemplate.throwMissingModuleErrorBlock({
					request: dep.userRequest
				});
			} else {
				str = `return ${runtimeTemplate.blockPromise({
					block,
					message: request,
					chunkGraph,
					runtimeRequirements
				})}.then(${runtimeTemplate.basicFunction(
					"",
					`return ${runtimeTemplate.moduleRaw({
						module: mod,
						chunkGraph,
						request,
						weak: false,
						runtimeRequirements
					})}`
				)});`;
			}

			getters.push(
				`${Template.toNormalComment(
					`[${name}] => ${request}`
				)}"${name}": ${runtimeTemplate.basicFunction("", str)}`
			);
		}

		sources.set(
			"javascript",
			new ConcatSource(
				`\n${
					runtimeTemplate.supportsConst() ? "const" : "var"
				} __MODULE_MAP__ = {${getters.join(",")}};`,
				`\n${
					runtimeTemplate.supportsConst() ? "const" : "var"
				} __GET_MODULE__ = ${runtimeTemplate.basicFunction(
					["module"],
					`return typeof __MODULE_MAP__[module] ==='function' ? __MODULE_MAP__[module].apply(null) : Promise.reject(new Error('Module ' + module + ' does not exist.'))`
				)};`,
				`\n\nmodule.exports = {${Template.indent([
					`\nget: ${runtimeTemplate.basicFunction(
						"",
						"return __GET_MODULE__"
					)},`
				])}};`
			)
		);

		return {
			sources,
			runtimeRequirements
		};
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}
};
