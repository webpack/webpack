/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const Generator = require("../Generator");
const { tryRunOrWebpackError } = require("../HookWebpackError");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const { compareModulesByIdentifier } = require("../util/comparators");
const memorize = require("../util/memorize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Template").RenderManifestEntry} RenderManifestEntry */
/** @typedef {import("../Template").RenderManifestOptions} RenderManifestOptions */

const getAsyncWebAssemblyGenerator = memorize(() =>
	require("./AsyncWebAssemblyGenerator")
);
const getAsyncWebAssemblyJavascriptGenerator = memorize(() =>
	require("./AsyncWebAssemblyJavascriptGenerator")
);
const getAsyncWebAssemblyParser = memorize(() =>
	require("./AsyncWebAssemblyParser")
);

/**
 * @typedef {Object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {Map<Module, CodeGenerationResult>} codeGenerationResults results of code generation
 */

/**
 * @typedef {Object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, RenderContext]>} renderModuleContent
 */

/** @type {WeakMap<Compilation, CompilationHooks>} */
const compilationHooksMap = new WeakMap();

class AsyncWebAssemblyModulesPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				renderModuleContent: new SyncWaterfallHook([
					"source",
					"module",
					"renderContext"
				])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"AsyncWebAssemblyModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = AsyncWebAssemblyModulesPlugin.getCompilationHooks(
					compilation
				);
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				normalModuleFactory.hooks.createParser
					.for("webassembly/async")
					.tap("AsyncWebAssemblyModulesPlugin", () => {
						const AsyncWebAssemblyParser = getAsyncWebAssemblyParser();

						return new AsyncWebAssemblyParser();
					});
				normalModuleFactory.hooks.createGenerator
					.for("webassembly/async")
					.tap("AsyncWebAssemblyModulesPlugin", () => {
						const AsyncWebAssemblyJavascriptGenerator = getAsyncWebAssemblyJavascriptGenerator();
						const AsyncWebAssemblyGenerator = getAsyncWebAssemblyGenerator();

						return Generator.byType({
							javascript: new AsyncWebAssemblyJavascriptGenerator(
								compilation.outputOptions.webassemblyModuleFilename
							),
							webassembly: new AsyncWebAssemblyGenerator(this.options)
						});
					});

				compilation.hooks.renderManifest.tap(
					"AsyncWebAssemblyModulesPlugin",
					(result, options) => {
						const { moduleGraph, chunkGraph, runtimeTemplate } = compilation;
						const {
							chunk,
							outputOptions,
							dependencyTemplates,
							codeGenerationResults
						} = options;

						for (const module of chunkGraph.getOrderedChunkModulesIterable(
							chunk,
							compareModulesByIdentifier
						)) {
							if (module.type === "webassembly/async") {
								const filenameTemplate =
									outputOptions.webassemblyModuleFilename;
								const filename = module.nameForCondition();

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
										chunkGraph,
										filename
									},
									auxiliary: true,
									identifier: `webassemblyAsyncModule${chunkGraph.getModuleId(
										module
									)}`,
									hash: chunkGraph.getModuleHash(module)
								});
							}
						}

						return result;
					}
				);
			}
		);
	}

	renderModule(module, renderContext, hooks) {
		const { codeGenerationResults } = renderContext;
		try {
			const moduleSource = codeGenerationResults
				.get(module)
				.sources.get("webassembly");
			return tryRunOrWebpackError(
				() =>
					hooks.renderModuleContent.call(moduleSource, module, renderContext),
				"AsyncWebAssemblyModulesPlugin.getCompilationHooks().renderModuleContent"
			);
		} catch (e) {
			e.module = module;
			throw e;
		}
	}
}

module.exports = AsyncWebAssemblyModulesPlugin;
