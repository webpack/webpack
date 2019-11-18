/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/AssetModulesPlugin.json");
const { compareModulesByIdentifier } = require("../util/comparators");
const AssetGenerator = require("./AssetGenerator");
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

				normalModuleFactory.hooks.createGenerator
					.for(type)
					.tap(plugin, generatorOptions => {
						validateOptions(schema, generatorOptions, {
							name: "Asset Modules Plugin"
						});

						return new AssetGenerator(compilation, generatorOptions);
					});

				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, runtimeTemplate, codeGenerationResults } = options;

					const { outputOptions } = runtimeTemplate;

					const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						"asset",
						compareModulesByIdentifier
					);
					if (modules) {
						for (const module of modules) {
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
