/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");
const {
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource
} = require("webpack-sources");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");

/** @typedef {import("webpack-sources").ConcatSource} ConcatSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("./util/createHash").Hash} Hash} */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates} */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext} */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate} */
/** @typedef {import("./ModuleGraph")} ModuleGraph} */
/** @typedef {import("./ChunkGraph")} ChunkGraph} */
/** @typedef {import("./Template").RenderManifestOptions} RenderManifestOptions} */
/** @typedef {import("./Template").RenderManifestEntry} RenderManifestEntry} */

/**
 * @typedef {Object} MainRenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {string} hash hash to be used for render call
 */

/**
 * @typedef {Object} RenderBootstrapContext
 * @property {Chunk} chunk the chunk
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {string} hash hash to be used for render call
 */

/**
 * @typedef {Object} UpdateHashForChunkContext
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

module.exports = class MainTemplate {
	/**
	 *
	 * @param {TODO=} outputOptions output options for the MainTemplate
	 */
	constructor(outputOptions) {
		/** @type {TODO?} */
		this.outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<TODO[], RenderManifestOptions>} */
			renderManifest: new SyncWaterfallHook(["result", "options"]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, MainRenderContext>} */
			modules: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, MainRenderContext>} */
			runtimeModules: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<string, RenderBootstrapContext>} */
			bootstrap: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, Chunk, string>} */
			localVars: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<string, RenderBootstrapContext>} */
			require: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, RenderBootstrapContext>} */
			requireExtensions: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, RenderBootstrapContext>} */
			beforeRuntime: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<string, Chunk, string>} */
			beforeStartup: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<string, RenderBootstrapContext>} */
			startup: new SyncWaterfallHook(["source", "renderContext"]),
			/** @type {SyncWaterfallHook<Source, ModuleTemplate, MainRenderContext>} */
			render: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<Source, Chunk, string>} */
			renderWithEntry: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<string, Chunk, string, number|string>} */
			moduleRequire: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"moduleIdExpression"
			]),
			/** @type {SyncWaterfallHook<string, object>} */
			assetPath: new SyncWaterfallHook(["path", "options"]),
			/** @type {SyncHook<Hash>} */
			hash: new SyncHook(["hash"]),
			/** @type {SyncHook<Hash, Chunk>} */
			hashForChunk: new SyncHook(["hash", "chunk"])
		});
		this.hooks.beforeRuntime.tap(
			"MainTemplate",
			(source, { chunk, hash, chunkGraph }) => {
				const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
					chunk
				);
				if (!runtimeRequirements.has(RuntimeGlobals.startupNoDefault)) {
					if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
						/** @type {string[]} */
						const buf = [];
						const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
							chunk
						);
						buf.push("// Load entry module and return exports");
						let i = chunkGraph.getNumberOfEntryModules(chunk);
						for (const entryModule of chunkGraph.getChunkEntryModulesIterable(
							chunk
						)) {
							const mayReturn = --i === 0 ? "return " : "";
							const moduleId = chunkGraph.getModuleId(entryModule);
							let moduleIdExpr = JSON.stringify(moduleId);
							if (runtimeRequirements.has(RuntimeGlobals.entryModuleId)) {
								moduleIdExpr = `${
									RuntimeGlobals.entryModuleId
								} = ${moduleIdExpr}`;
							}
							buf.push(`${mayReturn}__webpack_require__(${moduleIdExpr});`);
						}
						return Template.asString([
							"// the startup function",
							runtimeRequirements.has(RuntimeGlobals.startup)
								? `${RuntimeGlobals.startup} = function() {`
								: `function startup() {`,
							Template.indent(buf),
							"};"
						]);
					} else if (runtimeRequirements.has(RuntimeGlobals.startup)) {
						return Template.asString([
							"// the startup function",
							"// It's empty as no entry modules are in this chunk",
							`${RuntimeGlobals.startup} = function() {}`
						]);
					}
				}
				return source;
			}
		);
		this.hooks.startup.tap(
			"MainTemplate",
			(source, { chunk, hash, chunkGraph }) => {
				const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
					chunk
				);
				if (runtimeRequirements.has(RuntimeGlobals.startup)) {
					return Template.asString([
						"// run startup",
						`return ${RuntimeGlobals.startup}();`
					]);
				} else if (
					!runtimeRequirements.has(RuntimeGlobals.startupNoDefault) &&
					chunkGraph.getNumberOfEntryModules(chunk) > 0
				) {
					return Template.asString(["// run startup", `return startup();`]);
				}
				return source;
			}
		);
		this.hooks.render.tap(
			"MainTemplate",
			(bootstrapSource, moduleTemplate, renderContext) => {
				const source = new ConcatSource();
				source.add(
					"/******/ (function(modules, runtime) { // webpackBootstrap\n"
				);
				source.add('/******/ \t"use strict";\n');
				source.add(new PrefixSource("/******/", bootstrapSource));
				source.add("/******/ })\n");
				source.add(
					"/************************************************************************/\n"
				);
				source.add("/******/ (");
				source.add(
					this.hooks.modules.call(
						new RawSource(""),
						moduleTemplate,
						renderContext
					)
				);
				const runtimeModules = renderContext.chunkGraph.getChunkRuntimeModulesInOrder(
					renderContext.chunk
				);
				if (runtimeModules.length > 0) {
					source.add(",\n");
					source.add(
						Template.renderChunkRuntimeModules(runtimeModules, renderContext)
					);
				}
				source.add(")");
				return source;
			}
		);
		this.hooks.localVars.tap("MainTemplate", (source, chunk, hash) => {
			return Template.asString([
				source,
				"// The module cache",
				"var installedModules = {};"
			]);
		});
		this.hooks.require.tap("MainTemplate", (source, renderContext) => {
			const { chunk, chunkGraph } = renderContext;
			const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
			const moduleExecution = runtimeRequirements.has(
				RuntimeGlobals.interceptModuleExecution
			)
				? Template.asString([
						"var execOptions = { id: moduleId, module: module, factory: modules[moduleId], require: __webpack_require__ };",
						`${
							RuntimeGlobals.interceptModuleExecution
						}.forEach(function(handler) { handler(execOptions); });`,
						"module = execOptions.module;",
						"execOptions.factory.call(module.exports, module, module.exports, execOptions.require);"
				  ])
				: Template.asString([
						"modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);"
				  ]);
			return Template.asString([
				source,
				"// Check if module is in cache",
				"if(installedModules[moduleId]) {",
				Template.indent("return installedModules[moduleId].exports;"),
				"}",
				"// Create a new module (and put it into the cache)",
				"var module = installedModules[moduleId] = {",
				Template.indent(["i: moduleId,", "l: false,", "exports: {}"]),
				"};",
				"",
				outputOptions.strictModuleExceptionHandling
					? Template.asString([
							"// Execute the module function",
							"var threw = true;",
							"try {",
							Template.indent([moduleExecution, "threw = false;"]),
							"} finally {",
							Template.indent(["if(threw) delete installedModules[moduleId];"]),
							"}"
					  ])
					: Template.asString([
							"// Execute the module function",
							moduleExecution
					  ]),
				"",
				"// Flag the module as loaded",
				"module.l = true;",
				"",
				"// Return the exports of the module",
				"return module.exports;"
			]);
		});
		this.hooks.requireExtensions.tap(
			"MainTemplate",
			(source, renderContext) => {
				const { chunk, chunkGraph } = renderContext;
				const buf = [];

				const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(
					chunk
				);

				if (runtimeRequirements.has(RuntimeGlobals.moduleFactories)) {
					buf.push("");
					buf.push("// expose the modules object (__webpack_modules__)");
					buf.push(`${RuntimeGlobals.moduleFactories} = modules;`);
				}

				if (runtimeRequirements.has(RuntimeGlobals.moduleCache)) {
					buf.push("");
					buf.push("// expose the module cache");
					buf.push(`${RuntimeGlobals.moduleCache} = installedModules;`);
				}

				if (runtimeRequirements.has(RuntimeGlobals.interceptModuleExecution)) {
					buf.push("");
					buf.push("// expose the module execution interceptor");
					buf.push(`${RuntimeGlobals.interceptModuleExecution} = [];`);
				}

				return Template.asString(buf);
			}
		);
	}

	get requireFn() {
		return "__webpack_require__";
	}

	/**
	 *
	 * @param {RenderManifestOptions} options render manifest options
	 * @returns {RenderManifestEntry[]} returns render manifest
	 */
	getRenderManifest(options) {
		const result = [];

		this.hooks.renderManifest.call(result, options);

		return result;
	}

	/**
	 * @param {RenderBootstrapContext} renderContext options object
	 * @returns {string[]} the generated source of the bootstrap code
	 */
	renderBootstrap(renderContext) {
		const { hash, chunk } = renderContext;
		const buf = [];
		buf.push(this.hooks.bootstrap.call("", renderContext));
		buf.push(this.hooks.localVars.call("", chunk, hash));
		buf.push("");
		buf.push("// The require function");
		buf.push(`function __webpack_require__(moduleId) {`);
		buf.push(Template.indent(this.hooks.require.call("", renderContext)));
		buf.push("}");
		buf.push("");
		buf.push(
			Template.asString(this.hooks.requireExtensions.call("", renderContext))
		);
		buf.push("");
		buf.push(
			Template.asString(this.hooks.beforeRuntime.call("", renderContext))
		);
		if (
			renderContext.chunkGraph.getNumberOfRuntimeModules(renderContext.chunk) >
			0
		) {
			buf.push("// initialize runtime");
			buf.push("runtime(__webpack_require__);");
		}
		buf.push(Template.asString(this.hooks.beforeStartup.call("", chunk, hash)));
		buf.push(Template.asString(this.hooks.startup.call("", renderContext)));
		return buf;
	}

	/**
	 * @param {ModuleTemplate} moduleTemplate ModuleTemplate instance for render
	 * @param {MainRenderContext} renderContext options object
	 * @returns {ConcatSource} the newly generated source from rendering
	 */
	render(moduleTemplate, renderContext) {
		const { hash, chunk, chunkGraph } = renderContext;
		const buf = this.renderBootstrap(renderContext);
		let source = this.hooks.render.call(
			new OriginalSource(
				Template.prefix(buf, " \t") + "\n",
				"webpack/bootstrap"
			),
			moduleTemplate,
			renderContext
		);
		if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			source = this.hooks.renderWithEntry.call(source, chunk, hash);
		}
		if (!source) {
			throw new Error(
				"Compiler error: MainTemplate plugin 'render' should return something"
			);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	/**
	 *
	 * @param {object} options get public path options
	 * @returns {string} hook call
	 */
	getPublicPath(options) {
		return this.hooks.assetPath.call(
			this.outputOptions.publicPath || "",
			options
		);
	}

	getAssetPath(path, options) {
		return this.hooks.assetPath.call(path, options);
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("maintemplate");
		hash.update("3");
		this.hooks.hash.call(hash);
	}

	/**
	 * Updates hash with chunk-specific information from this template
	 * @param {Hash} hash the hash to update
	 * @param {Chunk} chunk the chunk
	 * @param {UpdateHashForChunkContext} context options object
	 * @returns {void}
	 */
	updateHashForChunk(hash, chunk, context) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
		for (const line of this.renderBootstrap({
			hash: "0000",
			chunk,
			chunkGraph: context.chunkGraph,
			moduleGraph: context.moduleGraph,
			runtimeTemplate: context.runtimeTemplate
		})) {
			hash.update(line);
		}
	}
};
