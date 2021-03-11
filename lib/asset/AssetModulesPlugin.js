/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const { validate } = require("schema-utils");
const { cleverMerge } = require("../util/cleverMerge");
const { compareModulesByIdentifier } = require("../util/comparators");
const memoize = require("../util/memoize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const getSchema = name => {
	const { definitions } = require("../../schemas/WebpackOptions.json");
	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};
const getGeneratorSchemaMap = {
	asset: memoize(() => getSchema("AssetGeneratorOptions")),
	"asset/resource": memoize(() => getSchema("AssetResourceGeneratorOptions")),
	"asset/inline": memoize(() => getSchema("AssetInlineGeneratorOptions"))
};

const getParserSchema = memoize(() => getSchema("AssetParserOptions"));
const getAssetGenerator = memoize(() => require("./AssetGenerator"));
const getAssetParser = memoize(() => require("./AssetParser"));
const getAssetSourceParser = memoize(() => require("./AssetSourceParser"));
const getAssetSourceGenerator = memoize(() =>
	require("./AssetSourceGenerator")
);

const type = "asset";
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
					.for("asset")
					.tap(plugin, parserOptions => {
						validate(getParserSchema(), parserOptions, {
							name: "Asset Modules Plugin",
							baseDataPath: "parser"
						});
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
					.for("asset/inline")
					.tap(plugin, parserOptions => {
						const AssetParser = getAssetParser();

						return new AssetParser(true);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/resource")
					.tap(plugin, parserOptions => {
						const AssetParser = getAssetParser();

						return new AssetParser(false);
					});
				normalModuleFactory.hooks.createParser
					.for("asset/source")
					.tap(plugin, parserOptions => {
						const AssetSourceParser = getAssetSourceParser();

						return new AssetSourceParser();
					});

				for (const type of ["asset", "asset/inline", "asset/resource"]) {
					normalModuleFactory.hooks.createGenerator
						.for(type)
						// eslint-disable-next-line no-loop-func
						.tap(plugin, generatorOptions => {
							validate(getGeneratorSchemaMap[type](), generatorOptions, {
								name: "Asset Modules Plugin",
								baseDataPath: "generator"
							});

							let dataUrl = undefined;
							if (type !== "asset/resource") {
								dataUrl = generatorOptions.dataUrl;
								if (!dataUrl || typeof dataUrl === "object") {
									dataUrl = {
										encoding: "base64",
										mimetype: undefined,
										...dataUrl
									};
								}
							}

							let filename = undefined;
							if (type !== "asset/inline") {
								filename = generatorOptions.filename;
							}

							const AssetGenerator = getAssetGenerator();

							return new AssetGenerator(
								dataUrl,
								filename,
								generatorOptions.emit !== false
							);
						});
				}
				normalModuleFactory.hooks.createGenerator
					.for("asset/source")
					.tap(plugin, () => {
						const AssetSourceGenerator = getAssetSourceGenerator();

						return new AssetSourceGenerator();
					});

				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, codeGenerationResults } = options;

					const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						"asset",
						compareModulesByIdentifier
					);
					if (modules) {
						for (const module of modules) {
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
						}
					}

					return result;
				});
			}
		);
	}
}

module.exports = AssetModulesPlugin;
