/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const { OriginalSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const ContainerExposedDependency = require("./ContainerExposedDependency");

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
/** @typedef {import("./ContainerEntryDependency")} ContainerEntryDependency */

/**
 * @typedef {Object} ExposeOptions
 * @property {string[]} import requests to exposed modules (last one is exported)
 */

const SOURCE_TYPES = new Set(["javascript"]);

class ContainerEntryModule extends Module {
	/**
	 * @param {string} name container entry name
	 * @param {[string, ExposeOptions][]} exposes list of exposed modules
	 * @param {string} shareScope name of the share scope
	 */
	constructor(name, exposes, shareScope) {
		super("javascript/dynamic", null);
		this._name = name;
		this._exposes = exposes;
		this._shareScope = shareScope;
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return SOURCE_TYPES;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `container entry (${this._shareScope}) ${JSON.stringify(
			this._exposes
		)}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `container entry`;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `webpack/container/entry/${this._name}`;
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

		for (const [name, options] of this._exposes) {
			const block = new AsyncDependenciesBlock(
				undefined,
				{ name },
				options.import[options.import.length - 1]
			);
			let idx = 0;
			for (const request of options.import) {
				const dep = new ContainerExposedDependency(name, request);
				dep.loc = {
					name,
					index: idx++
				};

				block.addDependency(dep);
			}
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
		const runtimeRequirements = new Set([
			RuntimeGlobals.definePropertyGetters,
			RuntimeGlobals.hasOwnProperty,
			RuntimeGlobals.exports
		]);
		const getters = [];

		for (const block of this.blocks) {
			const { dependencies } = block;

			const modules = dependencies.map(dependency => {
				const dep = /** @type {ContainerExposedDependency} */ (dependency);
				return {
					name: dep.exposedName,
					module: moduleGraph.getModule(dep),
					request: dep.userRequest
				};
			});

			let str;

			if (modules.some(m => !m.module)) {
				str = runtimeTemplate.throwMissingModuleErrorBlock({
					request: modules.map(m => m.request).join(", ")
				});
			} else {
				str = `return ${runtimeTemplate.blockPromise({
					block,
					message: "",
					chunkGraph,
					runtimeRequirements
				})}.then(${runtimeTemplate.returningFunction(
					runtimeTemplate.returningFunction(
						`(${modules
							.map(({ module, request }) =>
								runtimeTemplate.moduleRaw({
									module,
									chunkGraph,
									request,
									weak: false,
									runtimeRequirements
								})
							)
							.join(", ")})`
					)
				)});`;
			}

			getters.push(
				`${JSON.stringify(modules[0].name)}: ${runtimeTemplate.basicFunction(
					"",
					str
				)}`
			);
		}

		const source = Template.asString([
			`var moduleMap = {`,
			Template.indent(getters.join(",\n")),
			"};",
			`var get = ${runtimeTemplate.basicFunction("module, getScope", [
				`${RuntimeGlobals.currentRemoteGetScope} = getScope;`,
				// reusing the getScope variable to avoid creating a new var (and module is also used later)
				"getScope = (",
				Template.indent([
					`${RuntimeGlobals.hasOwnProperty}(moduleMap, module)`,
					Template.indent([
						"? moduleMap[module]()",
						`: Promise.resolve().then(${runtimeTemplate.basicFunction(
							"",
							"throw new Error('Module \"' + module + '\" does not exist in container.');"
						)})`
					])
				]),
				");",
				`${RuntimeGlobals.currentRemoteGetScope} = undefined;`,
				"return getScope;"
			])};`,
			`var init = ${runtimeTemplate.basicFunction("shareScope, initScope", [
				`if (!${RuntimeGlobals.shareScopeMap}) return;`,
				`var oldScope = ${RuntimeGlobals.shareScopeMap}[${JSON.stringify(
					this._shareScope
				)}];`,
				`var name = ${JSON.stringify(this._shareScope)}`,
				`if(oldScope && oldScope !== shareScope) throw new Error("Container initialization failed as it has already been initialized with a different share scope");`,
				`${RuntimeGlobals.shareScopeMap}[name] = shareScope;`,
				`return ${RuntimeGlobals.initializeSharing}(name, initScope);`
			])};`,
			"",
			"// This exports getters to disallow modifications",
			`${RuntimeGlobals.definePropertyGetters}(exports, {`,
			Template.indent([
				`get: ${runtimeTemplate.returningFunction("get")},`,
				`init: ${runtimeTemplate.returningFunction("init")}`
			]),
			"});"
		]);

		sources.set(
			"javascript",
			new OriginalSource(source, "webpack/container-entry")
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

	serialize(context) {
		const { write } = context;
		write(this._name);
		write(this._exposes);
		write(this._shareScope);
		super.serialize(context);
	}

	static deserialize(context) {
		const { read } = context;
		const obj = new ContainerEntryModule(read(), read(), read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	ContainerEntryModule,
	"webpack/lib/container/ContainerEntryModule"
);

module.exports = ContainerEntryModule;
