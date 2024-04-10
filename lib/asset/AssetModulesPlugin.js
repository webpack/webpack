/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const {
	ASSET_MODULE_TYPE_RESOURCE,
	ASSET_MODULE_TYPE_INLINE,
	ASSET_MODULE_TYPE,
	ASSET_MODULE_TYPE_SOURCE
} = require("../ModuleTypeConstants");
const { cleverMerge } = require("../util/cleverMerge");
const { compareModulesByIdentifier } = require("../util/comparators");
const createSchemaValidation = require("../util/create-schema-validation");
const memoize = require("../util/memoize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

/**
 * @param {string} name name of definitions
 * @returns {TODO} definition
 */
const getSchema = name => {
	const { definitions } = require("../../schemas/WebpackOptions.json");
	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};

const generatorValidationOptions = {
	name: "Asset Modules Plugin",
	baseDataPath: "generator"
};
const validateGeneratorOptions = {
	asset: createSchemaValidation(
		require("../../schemas/plugins/asset/AssetGeneratorOptions.check.js"),
		() => getSchema("AssetGeneratorOptions"),
		generatorValidationOptions
	),
	"asset/resource": createSchemaValidation(
		require("../../schemas/plugins/asset/AssetResourceGeneratorOptions.check.js"),
		() => getSchema("AssetResourceGeneratorOptions"),
		generatorValidationOptions
	),
	"asset/inline": createSchemaValidation(
		require("../../schemas/plugins/asset/AssetInlineGeneratorOptions.check.js"),
		() => getSchema("AssetInlineGeneratorOptions"),
		generatorValidationOptions
	)
};

const validateParserOptions = createSchemaValidation(
	require("../../schemas/plugins/asset/AssetParserOptions.check.js"),
	() => getSchema("AssetParserOptions"),
	{
		name: "Asset Modules Plugin",
		baseDataPath: "parser"
	}
);

const getAssetGenerator = memoize(() => require("./AssetGenerator"));
const getAssetParser = memoize(() => require("./AssetParser"));
const getAssetSourceParser = memoize(() => require("./AssetSourceParser"));
const getAssetSourceGenerator = memoize(() =>
	require("./AssetSourceGenerator")
);

const type = ASSET_MODULE_TYPE;
const plugin = "AssetModulesPlugin";

class AssetModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			plugin,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE)
					.tap(plugin, parserOptions => {
						validateParserOptions(parserOptions);
						parserOptions = cleverMerge(
							compiler.options.module.parser.asset,
							parserOptions
						);

						let dataUrlCondition = parserOptions.dataUrlCondition;
						if (!dataUrlCondition || typeof dataUrlCondition === "object") {
							dataUrlCondition = {
								maxSize: 8096,
								...dataUrlCondition
							};
						}

						const AssetParser = getAssetParser();

						return new AssetParser(dataUrlCondition);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_INLINE)
					.tap(plugin, parserOptions => {
						const AssetParser = getAssetParser();

						return new AssetParser(true);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_RESOURCE)
					.tap(plugin, parserOptions => {
						const AssetParser = getAssetParser();

						return new AssetParser(false);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_SOURCE)
					.tap(plugin, parserOptions => {
						const AssetSourceParser = getAssetSourceParser();

						return new AssetSourceParser();
					});

				for (const type of [
					ASSET_MODULE_TYPE,
					ASSET_MODULE_TYPE_INLINE,
					ASSET_MODULE_TYPE_RESOURCE
				]) {
					normalModuleFactory.hooks.createGenerator
						.for(type)
						.tap(plugin, generatorOptions => {
							validateGeneratorOptions[type](generatorOptions);

							let dataUrl = undefined;
							if (type !== ASSET_MODULE_TYPE_RESOURCE) {
								dataUrl = generatorOptions.dataUrl;
								if (!dataUrl || typeof dataUrl === "object") {
									dataUrl = {
										encoding: undefined,
										mimetype: undefined,
										...dataUrl
									};
								}
							}

							let filename = undefined;
							let publicPath = undefined;
							let outputPath = undefined;
							if (type !== ASSET_MODULE_TYPE_INLINE) {
								filename = generatorOptions.filename;
								publicPath = generatorOptions.publicPath;
								outputPath = generatorOptions.outputPath;
							}

							const AssetGenerator = getAssetGenerator();

							return new AssetGenerator(
								dataUrl,
								filename,
								publicPath,
								outputPath,
								generatorOptions.emit !== false
							);
						});
				}
				normalModuleFactory.hooks.createGenerator
					.for(ASSET_MODULE_TYPE_SOURCE)
					.tap(plugin, () => {
						const AssetSourceGenerator = getAssetSourceGenerator();

						return new AssetSourceGenerator();
					});

				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, codeGenerationResults } = options;

					const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						ASSET_MODULE_TYPE,
						compareModulesByIdentifier
					);
					if (modules) {
						for (const module of modules) {
							try {
								const codeGenResult = codeGenerationResults.get(
									module,
									chunk.runtime
								);
								result.push({
									render: () => codeGenResult.sources.get(type),
									filename:
										module.buildInfo.filename ||
										codeGenResult.data.get("filename"),
									info:
										module.buildInfo.assetInfo ||
										codeGenResult.data.get("assetInfo"),
									auxiliary: true,
									identifier: `assetModule${chunkGraph.getModuleId(module)}`,
									hash:
										module.buildInfo.fullContentHash ||
										codeGenResult.data.get("fullContentHash")
								});
							} catch (e) {
								/** @type {Error} */ (e).message +=
									`\nduring rendering of asset ${module.identifier()}`;
								throw e;
							}
						}
					}

					return result;
				});

				compilation.hooks.prepareModuleExecution.tap(
					"AssetModulesPlugin",
					(options, context) => {
						const { codeGenerationResult } = options;
						const source = codeGenerationResult.sources.get(ASSET_MODULE_TYPE);
						if (source === undefined) return;
						context.assets.set(codeGenerationResult.data.get("filename"), {
							source,
							info: codeGenerationResult.data.get("assetInfo")
						});
					}
				);
			}
		);
	}
}

module.exports = AssetModulesPlugin;
