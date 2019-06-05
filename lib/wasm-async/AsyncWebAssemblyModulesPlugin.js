/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Generator = require("../Generator");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const { compareModulesById } = require("../util/comparators");
const AsyncWebAssemblyGenerator = require("./AsyncWebAssemblyGenerator");
const AsyncWebAssemblyJavascriptGenerator = require("./AsyncWebAssemblyJavascriptGenerator");
const AsyncWebAssemblyParser = require("./AsyncWebAssemblyParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Template").RenderManifestOptions} RenderManifestOptions} */
/** @typedef {import("../Template").RenderManifestEntry} RenderManifestEntry} */

class AsyncWebAssemblyModulesPlugin {
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
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				normalModuleFactory.hooks.createParser
					.for("webassembly/async-experimental")
					.tap("AsyncWebAssemblyModulesPlugin", () => {
						return new AsyncWebAssemblyParser();
					});
				normalModuleFactory.hooks.createGenerator
					.for("webassembly/async-experimental")
					.tap("AsyncWebAssemblyModulesPlugin", () => {
						return Generator.byType({
							javascript: new AsyncWebAssemblyJavascriptGenerator(
								compilation.outputOptions.webassemblyModuleFilename
							),
							webassembly: new AsyncWebAssemblyGenerator(this.options)
						});
					});

				/**
				 *
				 * @param {RenderManifestEntry[]} result render entries
				 * @param {RenderManifestOptions} options context options
				 * @returns {RenderManifestEntry[]} render entries
				 */
				const handler = (result, options) => {
					const { moduleGraph, chunkGraph, runtimeTemplate } = compilation;
					const chunk = options.chunk;
					const outputOptions = options.outputOptions;
					const moduleTemplates = options.moduleTemplates;
					const dependencyTemplates = options.dependencyTemplates;

					for (const module of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesById(chunkGraph)
					)) {
						if (module.type === "webassembly/async-experimental") {
							const filenameTemplate = outputOptions.webassemblyModuleFilename;

							result.push({
								render: () =>
									moduleTemplates.webassembly.render(module, {
										chunk,
										dependencyTemplates,
										runtimeTemplate,
										moduleGraph,
										chunkGraph
									}),
								filenameTemplate,
								pathOptions: {
									module,
									chunkGraph
								},
								identifier: `webassemblyAsyncModule${chunkGraph.getModuleId(
									module
								)}`,
								hash: chunkGraph.getModuleHash(module)
							});
						}
					}

					return result;
				};
				compilation.chunkTemplate.hooks.renderManifest.tap(
					"WebAssemblyModulesPlugin",
					handler
				);
				compilation.mainTemplate.hooks.renderManifest.tap(
					"WebAssemblyModulesPlugin",
					handler
				);
			}
		);
	}
}

module.exports = AsyncWebAssemblyModulesPlugin;
