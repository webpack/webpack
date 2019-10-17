/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const Generator = require("../Generator");
const { compareModulesByIdentifier } = require("../util/comparators");
const AssetGenerator = require("./AssetGenerator");
const AssetJavascriptGenerator = require("./AssetJavascriptGenerator");
const AssetParser = require("./AssetParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

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

				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, runtimeTemplate, codeGenerationResults } = options;

					const { outputOptions } = runtimeTemplate;

					for (const module of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesByIdentifier
					)) {
						if (module.getSourceTypes().has("asset")) {
							const filename = module.nameForCondition();
							const filenameTemplate = outputOptions.assetModuleFilename;

							result.push({
								render: () =>
									codeGenerationResults.get(module).sources.get(type),
								filenameTemplate,
								pathOptions: {
									module,
									filename,
									chunkGraph
								},
								auxiliary: true,
								identifier: `assetModule${chunkGraph.getModuleId(module)}`,
								hash: chunkGraph.getModuleHash(module)
							});
						}
					}

					return result;
				});
			}
		);
	}
}

module.exports = AssetModulesPlugin;
