/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Generator = require("../Generator");
const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const { tryRunOrWebpackError } = require("../errors/HookWebpackError");
const { compareModulesByFullName } = require("../util/comparators");
const createHooksRegistry = require("../util/createHooksRegistry");
const lazyModule = require("../util/lazyModule");
const preloadModuleType = require("../util/preloadModuleType");
const AsyncWasmModule = require("./AsyncWasmModule");

/** @import { Source } from "webpack-sources" */
/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import CodeGenerationResults from "../CodeGenerationResults" */
/** @import Compiler from "../Compiler" */
/** @import DependencyTemplates from "../DependencyTemplates" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import RuntimeTemplate from "../RuntimeTemplate" */
/** @import WebpackError from "../errors/WebpackError" */

const getAsyncWebAssemblyGenerator = lazyModule(() =>
	require("./AsyncWebAssemblyGenerator")
);
const getAsyncWebAssemblyJavascriptGenerator = lazyModule(() =>
	require("./AsyncWebAssemblyJavascriptGenerator")
);
const getAsyncWebAssemblyParser = lazyModule(() =>
	require("./AsyncWebAssemblyParser")
);

/**
 * Defines the web assembly render context type used by this module.
 * @typedef {object} WebAssemblyRenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {CodeGenerationResults} codeGenerationResults results of code generation
 */

/**
 * Defines the compilation hooks type used by this module.
 * @typedef {object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, WebAssemblyRenderContext]>} renderModuleContent
 */

/**
 * Defines the async web assembly modules plugin options type used by this module.
 * @typedef {object} AsyncWebAssemblyModulesPluginOptions
 * @property {boolean=} mangleImports mangle imports
 */

const PLUGIN_NAME = "AsyncWebAssemblyModulesPlugin";

class AsyncWebAssemblyModulesPlugin {
	/**
	 * Creates an instance of AsyncWebAssemblyModulesPlugin.
	 * @param {AsyncWebAssemblyModulesPluginOptions} options options
	 */
	constructor(options) {
		/** @type {AsyncWebAssemblyModulesPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// A binary's name may carry the compilation hash, which the analyzable call site
		// leaves as a stand-in — so whatever the chunk loading is, the pass that fills it
		// in has to be there. Applying it twice is a no-op.
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const hooks =
					AsyncWebAssemblyModulesPlugin.getCompilationHooks(compilation);
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				preloadModuleType(normalModuleFactory, PLUGIN_NAME, [
					[
						WEBASSEMBLY_MODULE_TYPE_ASYNC,
						[
							getAsyncWebAssemblyParser,
							getAsyncWebAssemblyJavascriptGenerator,
							getAsyncWebAssemblyGenerator
						]
					]
				]);

				normalModuleFactory.hooks.createModuleClass
					.for(WEBASSEMBLY_MODULE_TYPE_ASYNC)
					.tap(
						PLUGIN_NAME,
						(createData, resolveData) =>
							new AsyncWasmModule({
								...createData,
								phase: resolveData.phase
							})
					);

				normalModuleFactory.hooks.createParser
					.for(WEBASSEMBLY_MODULE_TYPE_ASYNC)
					.tap(PLUGIN_NAME, () => {
						const AsyncWebAssemblyParser = getAsyncWebAssemblyParser.loaded();

						return new AsyncWebAssemblyParser();
					});
				normalModuleFactory.hooks.createGenerator
					.for(WEBASSEMBLY_MODULE_TYPE_ASYNC)
					.tap(PLUGIN_NAME, () => {
						const AsyncWebAssemblyJavascriptGenerator =
							getAsyncWebAssemblyJavascriptGenerator.loaded();
						const AsyncWebAssemblyGenerator =
							getAsyncWebAssemblyGenerator.loaded();

						return Generator.byType({
							javascript: new AsyncWebAssemblyJavascriptGenerator(),
							webassembly: new AsyncWebAssemblyGenerator(this.options)
						});
					});

				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { moduleGraph, chunkGraph, runtimeTemplate } = compilation;
					const {
						chunk,
						outputOptions,
						dependencyTemplates,
						codeGenerationResults
					} = options;

					for (const module of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesByFullName(compiler)
					)) {
						if (module.type === WEBASSEMBLY_MODULE_TYPE_ASYNC) {
							const filenameTemplate = outputOptions.webassemblyModuleFilename;

							result.push({
								render: () =>
									this.renderModule(
										module,
										{
											chunk,
											dependencyTemplates,
											runtimeTemplate,
											moduleGraph,
											chunkGraph,
											codeGenerationResults
										},
										hooks
									),
								filenameTemplate,
								pathOptions: {
									module,
									runtime: chunk.runtime,
									chunkGraph
								},
								auxiliary: true,
								identifier: `webassemblyAsyncModule${chunkGraph.getModuleId(
									module
								)}`,
								hash: chunkGraph.getModuleHash(module, chunk.runtime)
							});
						}
					}

					return result;
				});
			}
		);
	}

	/**
	 * Renders the newly generated source from rendering.
	 * @param {Module} module the rendered module
	 * @param {WebAssemblyRenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} the newly generated source from rendering
	 */
	renderModule(module, renderContext, hooks) {
		const { codeGenerationResults, chunk } = renderContext;
		try {
			const moduleSource = codeGenerationResults.getSource(
				module,
				chunk.runtime,
				"webassembly"
			);
			return tryRunOrWebpackError(
				() =>
					hooks.renderModuleContent.call(moduleSource, module, renderContext),
				"AsyncWebAssemblyModulesPlugin.getCompilationHooks().renderModuleContent"
			);
		} catch (err) {
			/** @type {WebpackError} */ (err).module = module;
			throw err;
		}
	}
}

AsyncWebAssemblyModulesPlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {CompilationHooks} */ ({
			renderModuleContent: new SyncWaterfallHook([
				"source",
				"module",
				"renderContext"
			])
		})
);

module.exports = AsyncWebAssemblyModulesPlugin;
