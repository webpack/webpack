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

const lazyRequire = require("../util/lazyRequire")(require);
const generatorSchema = lazyRequire(
	"../../schemas/plugins/AssetModulesPluginGenerator.json",
	false
);
const parserSchema = lazyRequire(
	"../../schemas/plugins/AssetModulesPluginParser.json",
	false
);
/** @type {typeof import('./AssetGenerator')} */
const AssetGenerator = lazyRequire("./AssetGenerator");
/** @type {typeof import('./AssetParser')} */
const AssetParser = lazyRequire("./AssetParser");
/** @type {typeof import('./AssetSourceGenerator')} */
const AssetSourceGenerator = lazyRequire("./AssetSourceGenerator");

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

						return new AssetParser(dataUrlCondition);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/inline")
					.tap(plugin, parserOptions => new AssetParser(true));
				normalModuleFactory.hooks.createParser
					.for("asset/resource")
					.tap(plugin, parserOptions => new AssetParser(false));
				normalModuleFactory.hooks.createParser
					.for("asset/source")
					.tap(plugin, parserOptions => new AssetParser(false));

				for (const type of ["asset", "asset/inline"]) {
					normalModuleFactory.hooks.createGenerator
						.for(type)
						// eslint-disable-next-line no-loop-func
						.tap(plugin, generatorOptions => {
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

							return new AssetGenerator(compilation, dataUrl);
						});
				}
				normalModuleFactory.hooks.createGenerator
					.for("asset/resource")
					.tap(plugin, () => new AssetGenerator(compilation));
				normalModuleFactory.hooks.createGenerator
					.for("asset/source")
					.tap(plugin, () => new AssetSourceGenerator());

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
