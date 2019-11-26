/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const validateOptions = require("schema-utils");
const { compareModulesByIdentifier } = require("../util/comparators");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

let generatorSchema;
let parserSchema;
let AssetGenerator;
let AssetParser;
let AssetSourceGenerator;

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
				normalModuleFactory.hooks.createParser
					.for("asset")
					.tap(plugin, parserOptions => {
						if (parserSchema === undefined) {
							parserSchema = require("../../schemas/plugins/AssetModulesPluginParser.json");
						}
						validateOptions(parserSchema, parserOptions, {
							name: "Asset Modules Plugin",
							baseDataPath: "parser"
						});

						let dataUrlCondition = parserOptions.dataUrlCondition;
						if (!dataUrlCondition || typeof dataUrlCondition === "object") {
							dataUrlCondition = {
								maxSize: 8096,
								...dataUrlCondition
							};
						}

						if (AssetParser === undefined) {
							AssetParser = require("./AssetParser");
						}
						return new AssetParser(dataUrlCondition);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/inline")
					.tap(plugin, parserOptions => {
						if (AssetParser === undefined) {
							AssetParser = require("./AssetParser");
						}
						return new AssetParser(true);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/resource")
					.tap(plugin, parserOptions => {
						if (AssetParser === undefined) {
							AssetParser = require("./AssetParser");
						}
						return new AssetParser(false);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/source")
					.tap(plugin, parserOptions => {
						if (AssetParser === undefined) {
							AssetParser = require("./AssetParser");
						}
						return new AssetParser(false);
					});

				for (const type of ["asset", "asset/inline"]) {
					normalModuleFactory.hooks.createGenerator
						.for(type)
						// eslint-disable-next-line no-loop-func
						.tap(plugin, generatorOptions => {
							if (generatorSchema === undefined) {
								generatorSchema = require("../../schemas/plugins/AssetModulesPluginGenerator.json");
							}
							validateOptions(generatorSchema, generatorOptions, {
								name: "Asset Modules Plugin",
								baseDataPath: "generator"
							});

							let dataUrl = generatorOptions.dataUrl;
							if (!dataUrl || typeof dataUrl === "object") {
								dataUrl = {
									encoding: "base64",
									mimetype: undefined,
									...dataUrl
								};
							}

							if (AssetGenerator === undefined) {
								AssetGenerator = require("./AssetGenerator");
							}
							return new AssetGenerator(compilation, dataUrl);
						});
				}
				normalModuleFactory.hooks.createGenerator
					.for("asset/resource")
					.tap(plugin, () => {
						if (AssetGenerator === undefined) {
							AssetGenerator = require("./AssetGenerator");
						}
						return new AssetGenerator(compilation);
					});
				normalModuleFactory.hooks.createGenerator
					.for("asset/source")
					.tap(plugin, () => {
						if (AssetSourceGenerator === undefined) {
							AssetSourceGenerator = require("./AssetSourceGenerator");
						}
						return new AssetSourceGenerator();
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
