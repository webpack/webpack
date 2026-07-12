/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import Generator from "../Generator.js";
import {
	JAVASCRIPT_TYPE,
	WEBASSEMBLY_TYPE
} from "../ModuleSourceTypeConstants.js";
import { WEBASSEMBLY_MODULE_TYPE_SYNC } from "../ModuleTypeConstants.js";
import WebAssemblyExportImportedDependency from "../dependencies/WebAssemblyExportImportedDependency.js";
import WebAssemblyImportDependency from "../dependencies/WebAssemblyImportDependency.js";
import { compareModulesByFullName } from "../util/comparators.js";
import memoize from "../util/memoize.js";
import WebAssemblyInInitialChunkError from "./WebAssemblyInInitialChunkError.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Module.js").default} Module */

const getWebAssemblyGenerator = memoize(
	() =>
		/** @type {typeof import("./WebAssemblyGenerator.js").default} */ (
			require("./WebAssemblyGenerator.js")
		)
);
const getWebAssemblyJavascriptGenerator = memoize(
	() =>
		/** @type {typeof import("./WebAssemblyJavascriptGenerator.js").default} */ (
			require("./WebAssemblyJavascriptGenerator.js")
		)
);
const getWebAssemblyParser = memoize(() => require("./WebAssemblyParser.js"));
const getSyncWasmModule = memoize(() => require("./SyncWasmModule.js"));

const PLUGIN_NAME = "WebAssemblyModulesPlugin";

/**
 * Options that influence how synchronous WebAssembly modules are transformed
 * and emitted.
 * @typedef {object} WebAssemblyModulesPluginOptions
 * @property {boolean=} mangleImports mangle imports
 */

/**
 * Adds parser, generator, manifest, and validation support for synchronous
 * WebAssembly modules in the compilation pipeline.
 */
class WebAssemblyModulesPlugin {
	/**
	 * Stores options that affect generated synchronous WebAssembly output.
	 * @param {WebAssemblyModulesPluginOptions} options options
	 */
	constructor(options) {
		/** @type {WebAssemblyModulesPluginOptions} */
		this.options = options;
	}

	/**
	 * Registers compilation hooks that parse and generate sync WebAssembly
	 * modules, emit their binary assets, and report invalid placement in initial
	 * chunks.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					WebAssemblyExportImportedDependency,
					normalModuleFactory
				);

				normalModuleFactory.hooks.createModuleClass
					.for(WEBASSEMBLY_MODULE_TYPE_SYNC)
					.tap(PLUGIN_NAME, (createData, _resolveData) => {
						const SyncWasmModule = getSyncWasmModule();

						return new SyncWasmModule(createData);
					});

				normalModuleFactory.hooks.createParser
					.for(WEBASSEMBLY_MODULE_TYPE_SYNC)
					.tap(PLUGIN_NAME, () => {
						const WebAssemblyParser = getWebAssemblyParser();

						return new WebAssemblyParser();
					});

				normalModuleFactory.hooks.createGenerator
					.for(WEBASSEMBLY_MODULE_TYPE_SYNC)
					.tap(PLUGIN_NAME, () => {
						const WebAssemblyJavascriptGenerator =
							getWebAssemblyJavascriptGenerator();
						const WebAssemblyGenerator = getWebAssemblyGenerator();

						return Generator.byType({
							[JAVASCRIPT_TYPE]: new WebAssemblyJavascriptGenerator(),
							[WEBASSEMBLY_TYPE]: new WebAssemblyGenerator(this.options)
						});
					});

				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, outputOptions, codeGenerationResults } = options;

					for (const module of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesByFullName(compiler)
					)) {
						if (module.type === WEBASSEMBLY_MODULE_TYPE_SYNC) {
							const filenameTemplate = outputOptions.webassemblyModuleFilename;

							result.push({
								render: () =>
									codeGenerationResults.getSource(
										module,
										chunk.runtime,
										"webassembly"
									),
								filenameTemplate,
								pathOptions: {
									module,
									runtime: chunk.runtime,
									chunkGraph
								},
								auxiliary: true,
								identifier: `webassemblyModule${chunkGraph.getModuleId(
									module
								)}`,
								hash: chunkGraph.getModuleHash(module, chunk.runtime)
							});
						}
					}

					return result;
				});

				compilation.hooks.afterChunks.tap(PLUGIN_NAME, () => {
					const chunkGraph = compilation.chunkGraph;
					/** @type {Set<Module>} */
					const initialWasmModules = new Set();
					for (const chunk of compilation.chunks) {
						if (chunk.canBeInitial()) {
							for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
								if (module.type === WEBASSEMBLY_MODULE_TYPE_SYNC) {
									initialWasmModules.add(module);
								}
							}
						}
					}
					for (const module of initialWasmModules) {
						compilation.errors.push(
							new WebAssemblyInInitialChunkError(
								module,
								compilation.moduleGraph,
								compilation.chunkGraph,
								compilation.requestShortener
							)
						);
					}
				});
			}
		);
	}
}

export default WebAssemblyModulesPlugin;

export { WebAssemblyModulesPlugin as "module.exports" };
