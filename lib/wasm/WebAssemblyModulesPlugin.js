/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Generator = require("../Generator");
const WebAssemblyExportImportedDependency = require("../dependencies/WebAssemblyExportImportedDependency");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const { compareModulesById } = require("../util/comparators");
const WebAssemblyGenerator = require("./WebAssemblyGenerator");
const WebAssemblyInInitialChunkError = require("./WebAssemblyInInitialChunkError");
const WebAssemblyJavascriptGenerator = require("./WebAssemblyJavascriptGenerator");
const WebAssemblyParser = require("./WebAssemblyParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleTemplate")} ModuleTemplate */
/** @typedef {import("../ModuleTemplate").RenderContext} RenderContext */

class WebAssemblyModulesPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"WebAssemblyModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					WebAssemblyExportImportedDependency,
					normalModuleFactory
				);

				normalModuleFactory.hooks.createParser
					.for("webassembly/sync")
					.tap("WebAssemblyModulesPlugin", () => {
						return new WebAssemblyParser();
					});

				normalModuleFactory.hooks.createGenerator
					.for("webassembly/sync")
					.tap("WebAssemblyModulesPlugin", () => {
						return Generator.byType({
							javascript: new WebAssemblyJavascriptGenerator(),
							webassembly: new WebAssemblyGenerator(this.options)
						});
					});

				compilation.hooks.renderManifest.tap(
					"WebAssemblyModulesPlugin",
					(result, options) => {
						const { chunkGraph } = compilation;
						const { chunk, outputOptions, codeGenerationResults } = options;

						for (const module of chunkGraph.getOrderedChunkModulesIterable(
							chunk,
							compareModulesById(chunkGraph)
						)) {
							if (module.type === "webassembly/sync") {
								const filenameTemplate =
									outputOptions.webassemblyModuleFilename;

								result.push({
									render: () =>
										codeGenerationResults
											.get(module)
											.sources.get("webassembly"),
									filenameTemplate,
									pathOptions: {
										module,
										chunkGraph
									},
									auxiliary: true,
									identifier: `webassemblyModule${chunkGraph.getModuleId(
										module
									)}`,
									hash: chunkGraph.getModuleHash(module)
								});
							}
						}

						return result;
					}
				);

				compilation.hooks.afterChunks.tap("WebAssemblyModulesPlugin", () => {
					const chunkGraph = compilation.chunkGraph;
					const initialWasmModules = new Set();
					for (const chunk of compilation.chunks) {
						if (chunk.canBeInitial()) {
							for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
								if (module.type === "webassembly/sync") {
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

module.exports = WebAssemblyModulesPlugin;
