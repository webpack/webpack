/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const {
	ASSET_URL_TYPE,
	JAVASCRIPT_TYPE
} = require("../ModuleSourceTypeConstants");
const {
	ASSET_MODULE_TYPE,
	ASSET_MODULE_TYPE_BYTES,
	ASSET_MODULE_TYPE_INLINE,
	ASSET_MODULE_TYPE_RESOURCE,
	ASSET_MODULE_TYPE_SOURCE,
	ASSET_MODULE_TYPE_WEBMANIFEST
} = require("../ModuleTypeConstants");
const { compareModulesByFullName } = require("../util/comparators");
const createHash = require("../util/createHash");
const { getUndoPath } = require("../util/identifier");
const lazyModule = require("../util/lazyModule");
const preloadModuleType = require("../util/preloadModuleType");
const { PUBLIC_PATH_AUTO } = require("../util/publicPathPlaceholder");

/** @import { Source } from "webpack-sources" */
/** @import { Schema } from "schema-utils" */
/**
 * @import {
 * 	AssetGeneratorDataUrl,
 * 	AssetModuleOutputPath,
 * 	RawPublicPath,
 * 	AssetModuleFilename
 * } from "../../declarations/WebpackOptions"
 */
/**
 * @import {
 * 	AssetInfo,
 * 	ExecuteModuleObject,
 * 	WebpackRequire
 * } from "../Compilation"
 */
/** @import Compiler from "../Compiler" */
/** @import { AssetModuleBuildInfo } from "./AssetModule" */
/** @import { CodeGenerationResult } from "../Module" */
/** @import NormalModule from "../NormalModule" */

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

const getAssetGenerator = lazyModule(() => require("./AssetGenerator"));
const getAssetParser = lazyModule(() => require("./AssetParser"));
const getAssetSourceParser = lazyModule(() => require("./AssetSourceParser"));
const getAssetBytesParser = lazyModule(() => require("./AssetBytesParser"));
const getAssetSourceGenerator = lazyModule(() =>
	require("./AssetSourceGenerator")
);
const getAssetBytesGenerator = lazyModule(() =>
	require("./AssetBytesGenerator")
);
const getAssetModule = lazyModule(() => require("./AssetModule"));
const getWebManifestParser = lazyModule(() => require("./WebManifestParser"));
const getWebManifestGenerator = lazyModule(() =>
	require("./WebManifestGenerator")
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
				preloadModuleType(normalModuleFactory, PLUGIN_NAME, [
					[
						ASSET_MODULE_TYPE,
						[getAssetModule, getAssetParser, getAssetGenerator]
					],
					[
						ASSET_MODULE_TYPE_INLINE,
						[getAssetModule, getAssetParser, getAssetGenerator]
					],
					[
						ASSET_MODULE_TYPE_RESOURCE,
						[getAssetModule, getAssetParser, getAssetGenerator]
					],
					[
						ASSET_MODULE_TYPE_SOURCE,
						[getAssetModule, getAssetSourceParser, getAssetSourceGenerator]
					],
					[
						ASSET_MODULE_TYPE_BYTES,
						[getAssetModule, getAssetBytesParser, getAssetBytesGenerator]
					],
					[
						ASSET_MODULE_TYPE_WEBMANIFEST,
						[getWebManifestParser, getWebManifestGenerator]
					]
				]);

				for (const type of [
					ASSET_MODULE_TYPE,
					ASSET_MODULE_TYPE_BYTES,
					ASSET_MODULE_TYPE_INLINE,
					ASSET_MODULE_TYPE_RESOURCE,
					ASSET_MODULE_TYPE_SOURCE
				]) {
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(PLUGIN_NAME, (createData, _resolveData) => {
							const AssetModule = getAssetModule.loaded();

							return new AssetModule(createData, this.options.sideEffectFree);
						});
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
								require("../../schemas/plugins/asset/AssetParserOptions.check")(
									options
								)
						);

						let dataUrlCondition = parserOptions.dataUrlCondition;
						if (!dataUrlCondition || typeof dataUrlCondition === "object") {
							dataUrlCondition = {
								maxSize: 8096,
								...dataUrlCondition
							};
						}

						const AssetParser = getAssetParser.loaded();

						return new AssetParser(dataUrlCondition);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_INLINE)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetParser = getAssetParser.loaded();

						return new AssetParser(true);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_RESOURCE)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetParser = getAssetParser.loaded();

						return new AssetParser(false);
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_SOURCE)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetSourceParser = getAssetSourceParser.loaded();

						return new AssetSourceParser();
					});
				normalModuleFactory.hooks.createParser
					.for(ASSET_MODULE_TYPE_BYTES)
					.tap(PLUGIN_NAME, (_parserOptions) => {
						const AssetBytesParser = getAssetBytesParser.loaded();

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
											require("../../schemas/plugins/asset/AssetGeneratorOptions.check")(
												options
											)
									);
									break;
								}
								case ASSET_MODULE_TYPE_RESOURCE: {
									compiler.validate(
										() => getSchema("AssetResourceGeneratorOptions"),
										generatorOptions,
										generatorValidationOptions,
										(options) =>
											require("../../schemas/plugins/asset/AssetResourceGeneratorOptions.check")(
												options
											)
									);
									break;
								}
								case ASSET_MODULE_TYPE_INLINE: {
									compiler.validate(
										() => getSchema("AssetInlineGeneratorOptions"),
										generatorOptions,
										generatorValidationOptions,
										(options) =>
											require("../../schemas/plugins/asset/AssetInlineGeneratorOptions.check")(
												options
											)
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

							const AssetGenerator = getAssetGenerator.loaded();

							return new AssetGenerator(
								compilation.moduleGraph,
								dataUrl,
								filename,
								publicPath,
								outputPath,
								generatorOptions.emit !== false,
								compilation
							);
						});
				}
				normalModuleFactory.hooks.createGenerator
					.for(ASSET_MODULE_TYPE_SOURCE)
					.tap(PLUGIN_NAME, () => {
						const AssetSourceGenerator = getAssetSourceGenerator.loaded();

						return new AssetSourceGenerator(compilation.moduleGraph);
					});

				normalModuleFactory.hooks.createGenerator
					.for(ASSET_MODULE_TYPE_BYTES)
					.tap(PLUGIN_NAME, () => {
						const AssetBytesGenerator = getAssetBytesGenerator.loaded();

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
								const buildInfo = /** @type {AssetModuleBuildInfo} */ (
									module.buildInfo
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
									const AssetGenerator = getAssetGenerator.loaded();
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
										(buildInfo.filename || data.get("filename"));
									entryInfo =
										/** @type {AssetInfo} */
										(buildInfo.assetInfo || data.get("assetInfo"));
									entryHash =
										/** @type {string} */
										(buildInfo.fullContentHash || data.get("fullContentHash"));
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
							const WebManifestParser = getWebManifestParser.loaded();

							return new WebManifestParser();
						});
					normalModuleFactory.hooks.createGenerator
						.for(ASSET_MODULE_TYPE_WEBMANIFEST)
						.tap(PLUGIN_NAME, () => {
							const WebManifestGenerator = getWebManifestGenerator.loaded();

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

				compilation.hooks.executeModule.tap(PLUGIN_NAME, (options, context) => {
					const { codeGenerationResult } = options;
					// A wrapper-less asset (`asset-url` only) would yield `{}` when
					// required at build time — emulate the wrapper's exports instead.
					if (!options.module.type.startsWith(ASSET_MODULE_TYPE)) return;
					if (codeGenerationResult.sources.has(JAVASCRIPT_TYPE)) return;
					const data = codeGenerationResult.data;
					if (!data) return;
					const moduleObject =
						/** @type {ExecuteModuleObject} */
						(options.moduleObject);
					// `__webpack_require__.p` honors the `importModule` publicPath
					// override (`URLDependency` requests it for wrapper-less assets).
					const publicPath =
						/** @type {WebpackRequire} */
						(context.__webpack_require__).p;
					const filename = data.get("filename");
					if (typeof filename === "string" && typeof publicPath === "string") {
						moduleObject.exports = publicPath + filename;
						return;
					}
					// data: uris (and assets without a runtime publicPath) resolve
					// chunk-independently — use the baked `asset-url`.
					const url = data.get("url");
					if (url && typeof url[ASSET_URL_TYPE] === "string") {
						moduleObject.exports = url[ASSET_URL_TYPE];
					}
				});
			}
		);
	}
}

module.exports = AssetModulesPlugin;
