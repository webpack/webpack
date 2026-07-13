/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

import { createRequire } from "node:module";

import HotUpdateChunk from "../HotUpdateChunk.js";
import {
	ASSET_MODULE_TYPE,
	ASSET_MODULE_TYPE_BYTES,
	ASSET_MODULE_TYPE_INLINE,
	ASSET_MODULE_TYPE_RESOURCE,
	ASSET_MODULE_TYPE_SOURCE,
	ASSET_MODULE_TYPE_WEBMANIFEST
} from "../ModuleTypeConstants.js";
import { compareModulesByFullName } from "../util/comparators.js";
import createHash from "../util/createHash.js";
import { getUndoPath } from "../util/identifier.js";
import memoize from "../util/memoize.js";
import { PUBLIC_PATH_AUTO } from "../util/publicPathPlaceholder.js";
import { RawSource } from "../util/webpack-sources.js";

const require = createRequire(import.meta.url);

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("schema-utils").Schema} Schema */
/** @typedef {import("../../declarations/WebpackOptions.js").AssetGeneratorDataUrl} AssetGeneratorDataUrl */
/** @typedef {import("../../declarations/WebpackOptions.js").AssetModuleOutputPath} AssetModuleOutputPath */
/** @typedef {import("../../declarations/WebpackOptions.js").RawPublicPath} RawPublicPath */
/** @typedef {import("../../declarations/WebpackOptions.js").AssetModuleFilename} AssetModuleFilename */
/** @typedef {import("../Compilation.js").AssetInfo} AssetInfo */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("./AssetModule.js").AssetModuleBuildInfo} AssetModuleBuildInfo */
/** @typedef {import("../Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../NormalModule.js").default} NormalModule */

/**
 * Returns definition.
 * @param {string} name name of definitions
 * @returns {Schema} definition
 */
const getSchema = (name) => {
	const { definitions } =
		/** @type {EXPECTED_ANY} */
		(require("../../schemas/WebpackOptions.json"));

	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};

const generatorValidationOptions = {
	name: "Asset Modules Plugin",
	baseDataPath: "generator"
};

const getAssetGenerator = memoize(() => require("./AssetGenerator.js"));
const getAssetParser = memoize(() => require("./AssetParser.js"));
const getAssetSourceParser = memoize(() => require("./AssetSourceParser.js"));
const getAssetBytesParser = memoize(() => require("./AssetBytesParser.js"));
const getAssetSourceGenerator = memoize(
	() =>
		/** @type {typeof import("./AssetSourceGenerator.js").default} */ (
			require("./AssetSourceGenerator.js")
		)
);
const getAssetBytesGenerator = memoize(
	() =>
		/** @type {typeof import("./AssetBytesGenerator.js").default} */ (
			require("./AssetBytesGenerator.js")
		)
);
const getAssetModule = memoize(() => require("./AssetModule.js"));
const getWebManifestParser = memoize(() => require("./WebManifestParser.js"));
const getWebManifestGenerator = memoize(
	() =>
		/** @type {typeof import("./WebManifestGenerator.js").default} */ (
			require("./WebManifestGenerator.js")
		)
);

const type = ASSET_MODULE_TYPE;
// Source type produced by `WebManifestGenerator` (its emitted, rewritten JSON).
const WEBMANIFEST_SOURCE_TYPE = "webmanifest";
const PLUGIN_NAME = "AssetModulesPlugin";

/**
 * Represents the asset modules plugin runtime component.
 * @typedef {object} AssetModulesPluginOptions
 * @property {boolean=} sideEffectFree
 */

class AssetModulesPlugin {
	/**
	 * Creates an instance of AssetModulesPlugin.
	 * @param {AssetModulesPluginOptions} options options
	 */
	constructor(options) {
		/** @type {AssetModulesPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const AssetModule = getAssetModule();
				for (const type of [
					ASSET_MODULE_TYPE,
					ASSET_MODULE_TYPE_BYTES,
					ASSET_MODULE_TYPE_INLINE,
					ASSET_MODULE_TYPE_RESOURCE,
					ASSET_MODULE_TYPE_SOURCE
				]) {
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(
							PLUGIN_NAME,
							(createData, _resolveData) =>
								new AssetModule(createData, this.options.sideEffectFree)
						);
				}

				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE)
					.tap(PLUGIN_NAME, (parserOptions) => {
						compiler.validate(
							() => getSchema("AssetParserOptions"),
							parserOptions,
							{
								name: "Asset Modules Plugin",
								baseDataPath: "parser"
							},
							(options) =>
								/** @type {typeof import("../../schemas/plugins/asset/AssetParserOptions.check.js")} */ (
									require("../../schemas/plugins/asset/AssetParserOptions.check.js")
								)(options)
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
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetParser = getAssetParser();

						return new AssetParser(true);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_RESOURCE)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetParser = getAssetParser();

						return new AssetParser(false);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_SOURCE)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetSourceParser = getAssetSourceParser();

						return new AssetSourceParser();
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_BYTES)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetBytesParser = getAssetBytesParser();

						return new AssetBytesParser();
					});

				for (const type of [
					ASSET_MODULE_TYPE,
					ASSET_MODULE_TYPE_INLINE,
					ASSET_MODULE_TYPE_RESOURCE
				]) {
					normalModuleFactory.hooks.createGenerator
						.for(type)
						.tap(PLUGIN_NAME, (generatorOptions) => {
							switch (type) {
								case ASSET_MODULE_TYPE: {
									compiler.validate(
										() => getSchema("AssetGeneratorOptions"),
										generatorOptions,
										generatorValidationOptions,
										(options) =>
											/** @type {typeof import("../../schemas/plugins/asset/AssetGeneratorOptions.check.js")} */ (
												require("../../schemas/plugins/asset/AssetGeneratorOptions.check.js")
											)(options)
									);
									break;
								}
								case ASSET_MODULE_TYPE_RESOURCE: {
									compiler.validate(
										() => getSchema("AssetResourceGeneratorOptions"),
										generatorOptions,
										generatorValidationOptions,
										(options) =>
											/** @type {typeof import("../../schemas/plugins/asset/AssetResourceGeneratorOptions.check.js")} */ (
												require("../../schemas/plugins/asset/AssetResourceGeneratorOptions.check.js")
											)(options)
									);
									break;
								}
								case ASSET_MODULE_TYPE_INLINE: {
									compiler.validate(
										() => getSchema("AssetInlineGeneratorOptions"),
										generatorOptions,
										generatorValidationOptions,
										(options) =>
											/** @type {typeof import("../../schemas/plugins/asset/AssetInlineGeneratorOptions.check.js")} */ (
												require("../../schemas/plugins/asset/AssetInlineGeneratorOptions.check.js")
											)(options)
									);
									break;
								}
							}

							/** @type {undefined | AssetGeneratorDataUrl} */
							let dataUrl;
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

							/** @type {undefined | AssetModuleFilename} */
							let filename;
							/** @type {undefined | RawPublicPath} */
							let publicPath;
							/** @type {undefined | AssetModuleOutputPath} */
							let outputPath;
							if (type !== ASSET_MODULE_TYPE_INLINE) {
								filename = generatorOptions.filename;
								publicPath = generatorOptions.publicPath;
								outputPath = generatorOptions.outputPath;
							}

							const AssetGenerator = getAssetGenerator();

							return new AssetGenerator(
								compilation.moduleGraph,
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
					.tap(PLUGIN_NAME, () => {
						const AssetSourceGenerator = getAssetSourceGenerator();

						return new AssetSourceGenerator(compilation.moduleGraph);
					});

				normalModuleFactory.hooks.createGenerator
					.for(ASSET_MODULE_TYPE_BYTES)
					.tap(PLUGIN_NAME, () => {
						const AssetBytesGenerator = getAssetBytesGenerator();

						return new AssetBytesGenerator(compilation.moduleGraph);
					});

				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, codeGenerationResults, runtimeTemplate } = options;

					const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						ASSET_MODULE_TYPE,
						compareModulesByFullName(compilation.compiler)
					);
					if (modules) {
						for (const module of modules) {
							try {
								const codeGenResult = codeGenerationResults.get(
									module,
									chunk.runtime
								);
								const data =
									/** @type {NonNullable<CodeGenerationResult["data"]>} */
									(codeGenResult.data);
								const errored = module.getNumberOfErrors() > 0;

								/** @type {string} */
								let entryFilename;
								/** @type {AssetInfo} */
								let entryInfo;
								/** @type {string} */
								let entryHash;

								if (errored) {
									const erroredModule = /** @type {NormalModule} */ (module);
									const AssetGenerator = getAssetGenerator();
									const [fullContentHash, contentHash] =
										AssetGenerator.getFullContentHash(
											erroredModule,
											runtimeTemplate
										);
									const { filename, assetInfo } =
										AssetGenerator.getFilenameWithInfo(
											erroredModule,
											{
												filename:
													erroredModule.generatorOptions &&
													erroredModule.generatorOptions.filename,
												outputPath:
													erroredModule.generatorOptions &&
													erroredModule.generatorOptions.outputPath
											},
											{
												runtime: chunk.runtime,
												runtimeTemplate,
												chunkGraph
											},
											contentHash,
											fullContentHash
										);
									entryFilename = filename;
									entryInfo = assetInfo;
									entryHash = fullContentHash;
								} else {
									entryFilename =
										/** @type {string} */
										(data.get("filename"));
									entryInfo =
										/** @type {AssetInfo} */
										(data.get("assetInfo"));
									entryHash =
										/** @type {string} */
										(data.get("fullContentHash"));
								}

								result.push({
									render: () =>
										/** @type {Source} */ (codeGenResult.sources.get(type)),
									filename: entryFilename,
									info: entryInfo,
									auxiliary: true,
									identifier: `assetModule${chunkGraph.getModuleId(module)}`,
									hash: entryHash
								});
							} catch (err) {
								/** @type {Error} */ (err).message +=
									`\nduring rendering of asset ${module.identifier()}`;
								throw err;
							}
						}
					}

					return result;
				});

				// A Web App Manifest (`asset/webmanifest`, gated on `experiments.html`)
				// parses/emits like an asset, but its icon URLs are rewritten in place
				// and the emitted file needs its own per-file public-path resolution.
				if (compilation.options.experiments.html) {
					normalModuleFactory.hooks.createParser
						.for(ASSET_MODULE_TYPE_WEBMANIFEST)
						.tap(PLUGIN_NAME, () => {
							const WebManifestParser = getWebManifestParser();

							return new WebManifestParser();
						});
					normalModuleFactory.hooks.createGenerator
						.for(ASSET_MODULE_TYPE_WEBMANIFEST)
						.tap(PLUGIN_NAME, () => {
							const WebManifestGenerator = getWebManifestGenerator();

							return new WebManifestGenerator(compilation.moduleGraph);
						});

					compilation.hooks.renderManifest.tap(
						PLUGIN_NAME,
						(result, options) => {
							const { chunk, codeGenerationResults } = options;
							if (chunk instanceof HotUpdateChunk) return result;
							const { chunkGraph, outputOptions } = compilation;
							const modules =
								chunkGraph.getOrderedChunkModulesIterableBySourceType(
									chunk,
									WEBMANIFEST_SOURCE_TYPE,
									compareModulesByFullName(compilation.compiler)
								);
							if (!modules) return result;
							for (const module of modules) {
								const codeGenResult = codeGenerationResults.get(
									module,
									chunk.runtime
								);
								const source = codeGenResult.sources.get(
									WEBMANIFEST_SOURCE_TYPE
								);
								if (!source) continue;
								const filename = /** @type {string} */ (
									codeGenResult.data && codeGenResult.data.get("filename")
								);
								if (!filename) continue;
								// Icon URLs resolve relative to the manifest's own location.
								const undoPath = getUndoPath(
									filename,
									/** @type {string} */ (outputOptions.path),
									false
								);
								const content = source
									.source()
									.toString()
									.split(PUBLIC_PATH_AUTO)
									.join(undoPath);
								const hash = createHash(outputOptions.hashFunction || "md4");
								hash.update(content);
								const contentHash = /** @type {string} */ (
									hash.digest(outputOptions.hashDigest || "hex")
								).slice(0, outputOptions.hashDigestLength || 20);
								result.push({
									render: () => new RawSource(content),
									filename,
									info: { immutable: true },
									auxiliary: true,
									identifier: `webManifestModule${chunkGraph.getModuleId(
										module
									)}|${filename}`,
									hash: contentHash
								});
							}
							return result;
						}
					);
				}

				compilation.hooks.prepareModuleExecution.tap(
					PLUGIN_NAME,
					(options, context) => {
						const { codeGenerationResult } = options;
						const source = codeGenerationResult.sources.get(ASSET_MODULE_TYPE);
						if (source === undefined) return;
						const data =
							/** @type {NonNullable<CodeGenerationResult["data"]>} */
							(codeGenerationResult.data);
						context.assets.set(
							/** @type {string} */
							(data.get("filename")),
							{
								source,
								info: data.get("assetInfo")
							}
						);
					}
				);
			}
		);
	}
}

export default AssetModulesPlugin;

export { AssetModulesPlugin as "module.exports" };
