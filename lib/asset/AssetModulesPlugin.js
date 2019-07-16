/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Generator = require("../Generator");
const { compareModulesById } = require("../util/comparators");
const AssetGenerator = require("./AssetGenerator");
const AssetJavascriptGenerator = require("./AssetJavascriptGenerator");
const AssetParser = require("./AssetParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkTemplate")} ChunkTemplate */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../MainTemplate")} MainTemplate */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleTemplate")} ModuleTemplate */
/** @typedef {import("../ModuleTemplate").RenderContext} RenderContext */

const type = "asset";
const plugin = "AssetModulesPlugin";

class AssetModulesPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			plugin,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createParser.for(type).tap(plugin, () => {
					return new AssetParser();
				});

				normalModuleFactory.hooks.createGenerator.for(type).tap(plugin, () => {
					return Generator.byType({
						asset: new AssetGenerator(),
						javascript: new AssetJavascriptGenerator(compilation)
					});
				});

				compilation.mainTemplate.hooks.renderManifest.tap(
					plugin,
					(result, options) => {
						const { chunkGraph, moduleGraph } = compilation;
						const {
							chunk,
							moduleTemplates,
							dependencyTemplates,
							runtimeTemplate
						} = options;

						const { outputOptions } = runtimeTemplate;

						for (const module of chunkGraph.getOrderedChunkModulesIterable(
							chunk,
							compareModulesById(chunkGraph)
						)) {
							if (module.getSourceTypes().has("asset")) {
								const filename = module.nameForCondition();
								const filenameTemplate = outputOptions.assetModuleFilename;

								result.push({
									render: () =>
										this.renderAsset(module, moduleTemplates.asset, {
											chunk,
											chunkGraph,
											moduleGraph,
											dependencyTemplates,
											runtimeTemplate
										}),
									filenameTemplate,
									pathOptions: {
										module,
										filename,
										chunkGraph
									},
									identifier: `assetModule${chunkGraph.getModuleId(module)}`,
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

	/**
	 * @param {Module} module the module to render
	 * @param {ModuleTemplate} moduleTemplate the module template
	 * @param {RenderContext} renderContext the render context
	 * @returns {Source} the rendered source
	 */
	/* eslint-enable */
	renderAsset(module, moduleTemplate, renderContext) {
		return moduleTemplate.render(module, renderContext);
	}
}

module.exports = AssetModulesPlugin;
