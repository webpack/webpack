/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const { ConcatSource, RawSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const ProgressPlugin = require("./ProgressPlugin");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");
const createHash = require("./util/createHash");
const { dirname, relative } = require("./util/fs");
const generateDebugId = require("./util/generateDebugId");
const { makePathsAbsolute } = require("./util/identifier");

/** @typedef {import("webpack-sources").MapOptions} MapOptions */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").DevtoolNamespace} DevtoolNamespace */
/** @typedef {import("../declarations/WebpackOptions").DevtoolModuleFilenameTemplate} DevtoolModuleFilenameTemplate */
/** @typedef {import("../declarations/WebpackOptions").DevtoolFallbackModuleFilenameTemplate} DevtoolFallbackModuleFilenameTemplate */
/** @typedef {import("../declarations/plugins/SourceMapDevToolPlugin").SourceMapDevToolPluginOptions} SourceMapDevToolPluginOptions */
/** @typedef {import("../declarations/plugins/SourceMapDevToolPlugin").Rules} Rules */
/** @typedef {import("./CacheFacade").ItemCacheFacade} ItemCacheFacade */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation").Asset} Asset */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule").RawSourceMap} RawSourceMap */
/** @typedef {import("./TemplatedPathPlugin").TemplatePath} SourceMappingURLComment */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */

/**
 * Defines the source map task type used by this module.
 * @typedef {object} SourceMapTask
 * @property {Source} asset
 * @property {AssetInfo} assetInfo
 * @property {(string | Module)[]} modules
 * @property {string} source
 * @property {string} file
 * @property {RawSourceMap} sourceMap
 * @property {ItemCacheFacade} cacheItem cache item
 */

const METACHARACTERS_REGEXP = /[-[\]\\/{}()*+?.^$|]/g;
const CONTENT_HASH_DETECT_REGEXP = /\[contenthash(?::\w+)?\]/;
const CSS_AND_JS_MODULE_EXTENSIONS_REGEXP = /\.((c|m)?js|css)($|\?)/i;
const CSS_EXTENSION_DETECT_REGEXP = /\.css(?:$|\?)/i;
const MAP_URL_COMMENT_REGEXP = /\[map\]/g;
const URL_COMMENT_REGEXP = /\[url\]/g;
const URL_FORMATTING_REGEXP = /^\n\/\/(.*)$/;

/**
 * Reset's .lastIndex of stateful Regular Expressions
 * For when `test` or `exec` is called on them
 * @param {RegExp} regexp Stateful Regular Expression to be reset
 * @returns {void}
 */
const resetRegexpState = (regexp) => {
	regexp.lastIndex = -1;
};

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = (str) => str.replace(METACHARACTERS_REGEXP, "\\$&");

/**
 * Returns a structural clone of a source map so that callers can mutate it
 * without affecting the original (which may be shared between multiple
 * SourceMapDevToolPlugin instances running on the same asset).
 * @param {RawSourceMap} sourceMap source map to clone
 * @returns {RawSourceMap} cloned source map
 */
const cloneSourceMap = (sourceMap) => ({
	...sourceMap,
	sources: sourceMap.sources ? [...sourceMap.sources] : sourceMap.sources,
	sourcesContent: sourceMap.sourcesContent
		? [...sourceMap.sourcesContent]
		: sourceMap.sourcesContent,
	names: sourceMap.names ? [...sourceMap.names] : sourceMap.names
});

/**
 * Extracts source and source map from a Source object, with a shared stash so
 * that subsequent plugin instances can recover the original map after the asset
 * has been wrapped by an earlier instance (which drops the internal map).
 * @param {string} file file name
 * @param {Source} asset source object
 * @param {MapOptions} options map extraction options
 * @param {Map<string, RawSourceMap>} stash compilation-scoped cache of pristine source maps
 * @returns {{ source: string | Buffer, sourceMap: RawSourceMap } | undefined} extracted pair or undefined when no map is available
 */
const extractSourceAndMap = (file, asset, options, stash) => {
	/** @type {string | Buffer} */
	let source;
	/** @type {null | RawSourceMap} */
	let sourceMap;
	if (asset.sourceAndMap) {
		const sourceAndMap = asset.sourceAndMap(options);
		sourceMap = sourceAndMap.map;
		source = sourceAndMap.source;
	} else {
		sourceMap = asset.map(options);
		source = asset.source();
	}
	if (!sourceMap) {
		// The asset itself has no internal source map. This is the typical case
		// after a previous SourceMapDevToolPlugin instance has already wrapped
		// the asset in a RawSource. Recover the original map from the stash.
		const stashed = stash.get(file);
		if (!stashed) return;
		sourceMap = cloneSourceMap(stashed);
	} else if (!stash.has(file)) {
		// First plugin instance to extract this file — remember a pristine
		// copy so subsequent instances can mutate freely without disturbing it.
		stash.set(file, cloneSourceMap(sourceMap));
	}
	if (typeof source !== "string") return;
	return { source, sourceMap };
};

/**
 * Creating {@link SourceMapTask} for given file
 * @param {string} file current compiled file
 * @param {Source} asset the asset
 * @param {AssetInfo} assetInfo the asset info
 * @param {MapOptions} options source map options
 * @param {Compilation} compilation compilation instance
 * @param {ItemCacheFacade} cacheItem cache item
 * @param {Map<string, RawSourceMap>} stash compilation-scoped cache of pristine source maps
 * @returns {SourceMapTask | undefined} created task instance or `undefined`
 */
const getTaskForFile = (
	file,
	asset,
	assetInfo,
	options,
	compilation,
	cacheItem,
	stash
) => {
	const extracted = extractSourceAndMap(file, asset, options, stash);
	if (!extracted) return;
	const { source, sourceMap } = extracted;
	const context = compilation.options.context;
	const root = compilation.compiler.root;
	const cachedAbsolutify = makePathsAbsolute.bindContextCache(context, root);
	const modules = sourceMap.sources.map((source) => {
		if (!source.startsWith("webpack://")) return source;
		source = cachedAbsolutify(source.slice(10));
		const module = compilation.findModule(source);
		return module || source;
	});

	return {
		file,
		asset,
		source: /** @type {string} */ (source),
		assetInfo,
		sourceMap,
		modules,
		cacheItem
	};
};

/**
 * Shared, compilation-scoped stash of pristine source maps keyed by asset
 * filename. Populated by the first SourceMapDevToolPlugin instance to extract
 * a map from a given asset, then reused by subsequent instances whose own
 * extraction would otherwise return `null` (because the asset has already been
 * replaced with a RawSource that has no internal map).
 */
const SOURCE_MAP_STASH = Symbol("SourceMapDevToolPlugin source-map stash");

const PLUGIN_NAME = "SourceMapDevToolPlugin";

/**
 * Serializes a Rules value (string, RegExp, function, or array thereof) into a
 * stable string suitable for inclusion in a cache key.
 * @param {EXPECTED_ANY} rule rule value
 * @returns {string} serialized representation
 */
const serializeRule = (rule) => {
	if (rule === undefined) return "";
	if (Array.isArray(rule)) return `[${rule.map(serializeRule).join(",")}]`;
	if (rule instanceof RegExp) return `re:${rule.toString()}`;
	if (typeof rule === "function") return `fn:${rule.toString()}`;
	return `s:${rule}`;
};

class SourceMapDevToolPlugin {
	/**
	 * Creates an instance of SourceMapDevToolPlugin.
	 * @param {SourceMapDevToolPluginOptions=} options options object
	 * @throws {Error} throws error, if got more than 1 arguments
	 */
	constructor(options = {}) {
		/** @type {undefined | null | false | string} */
		this.sourceMapFilename = options.filename;
		/** @type {false | SourceMappingURLComment} */
		this.sourceMappingURLComment =
			options.append === false
				? false
				: // eslint-disable-next-line no-useless-concat
					options.append || "\n//# source" + "MappingURL=[url]";
		/** @type {DevtoolModuleFilenameTemplate} */
		this.moduleFilenameTemplate =
			options.moduleFilenameTemplate || "webpack://[namespace]/[resourcePath]";
		/** @type {DevtoolFallbackModuleFilenameTemplate} */
		this.fallbackModuleFilenameTemplate =
			options.fallbackModuleFilenameTemplate ||
			"webpack://[namespace]/[resourcePath]?[hash]";
		/** @type {DevtoolNamespace} */
		this.namespace = options.namespace || "";
		/** @type {SourceMapDevToolPluginOptions} */
		this.options = options;
		// Cache salt derived from output-affecting options, so that two
		// SourceMapDevToolPlugin instances (or `devtool` + a plugin) operating
		// on the same asset don't share a cache entry.
		/** @type {string} */
		this._cacheSalt = [
			serializeRule(options.filename),
			typeof options.append === "function"
				? `fn:${options.append.toString()}`
				: `s:${options.append}`,
			serializeRule(this.moduleFilenameTemplate),
			serializeRule(this.fallbackModuleFilenameTemplate),
			`m:${options.module !== false}`,
			`c:${options.columns !== false}`,
			`n:${Boolean(options.noSources)}`,
			`d:${Boolean(options.debugIds)}`,
			`sr:${options.sourceRoot || ""}`,
			`il:${serializeRule(options.ignoreList)}`,
			`pp:${options.publicPath || ""}`,
			`fc:${options.fileContext || ""}`
		].join("|");
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../schemas/plugins/SourceMapDevToolPlugin.json"),
				this.options,
				{
					name: "SourceMap DevTool Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../schemas/plugins/SourceMapDevToolPlugin.check")(options)
			);
		});

		const outputFs =
			/** @type {OutputFileSystem} */
			(compiler.outputFileSystem);
		const sourceMapFilename = this.sourceMapFilename;
		const sourceMappingURLComment = this.sourceMappingURLComment;
		const moduleFilenameTemplate = this.moduleFilenameTemplate;
		const namespace = this.namespace;
		const fallbackModuleFilenameTemplate = this.fallbackModuleFilenameTemplate;
		const requestShortener = compiler.requestShortener;
		const options = this.options;
		options.test = options.test || CSS_AND_JS_MODULE_EXTENSIONS_REGEXP;

		/** @type {(filename: string) => boolean} */
		const matchObject = ModuleFilenameHelpers.matchObject.bind(
			undefined,
			options
		);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);

			// Each compilation gets a single shared stash that all
			// SourceMapDevToolPlugin instances cooperate on, so the second
			// instance to run can still recover the original source map after
			// the first instance has replaced the asset with a RawSource.
			/** @type {Map<string, RawSourceMap>} */
			let stash =
				/** @type {Map<string, RawSourceMap>} */
				(/** @type {EXPECTED_ANY} */ (compilation)[SOURCE_MAP_STASH]);
			if (!stash) {
				stash = new Map();
				/** @type {EXPECTED_ANY} */ (compilation)[SOURCE_MAP_STASH] = stash;
			}

			compilation.hooks.processAssets.tapAsync(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
					additionalAssets: true
				},
				(assets, callback) => {
					const chunkGraph = compilation.chunkGraph;
					const cache = compilation.getCache(PLUGIN_NAME);
					/** @type {Map<string | Module, string>} */
					const moduleToSourceNameMapping = new Map();
					const reportProgress =
						ProgressPlugin.getReporter(compilation.compiler) || (() => {});

					/** @type {Map<string, Chunk>} */
					const fileToChunk = new Map();
					for (const chunk of compilation.chunks) {
						for (const file of chunk.files) {
							fileToChunk.set(file, chunk);
						}
						for (const file of chunk.auxiliaryFiles) {
							fileToChunk.set(file, chunk);
						}
					}

					/** @type {string[]} */
					const files = [];
					for (const file of Object.keys(assets)) {
						if (matchObject(file)) {
							files.push(file);
						}
					}

					reportProgress(0);
					/** @type {SourceMapTask[]} */
					const tasks = [];
					let fileIndex = 0;

					asyncLib.each(
						files,
						(file, callback) => {
							const asset =
								/** @type {Readonly<Asset>} */
								(compilation.getAsset(file));

							const chunk = fileToChunk.get(file);
							const sourceMapNamespace = compilation.getPath(this.namespace, {
								chunk
							});

							const cacheItem = cache.getItemCache(
								file,
								cache.mergeEtags(
									cache.mergeEtags(
										cache.getLazyHashedEtag(asset.source),
										sourceMapNamespace
									),
									this._cacheSalt
								)
							);

							cacheItem.get((err, cacheEntry) => {
								if (err) {
									return callback(err);
								}
								/**
								 * If presented in cache, reassigns assets. Cache assets already have source maps.
								 */
								if (cacheEntry) {
									// Populate the shared stash from the still-unwrapped asset
									// before replacing it, so that any subsequent
									// SourceMapDevToolPlugin instance can recover the original
									// source map even though the persistent cache hit lets us
									// skip the full processing here.
									if (!stash.has(file)) {
										extractSourceAndMap(
											file,
											asset.source,
											{
												module: options.module,
												columns: options.columns
											},
											stash
										);
									}

									const { assets, assetsInfo } = cacheEntry;
									for (const cachedFile of Object.keys(assets)) {
										if (cachedFile === file) {
											compilation.updateAsset(
												cachedFile,
												assets[cachedFile],
												assetsInfo[cachedFile]
											);
										} else {
											compilation.emitAsset(
												cachedFile,
												assets[cachedFile],
												assetsInfo[cachedFile]
											);
										}
										/**
										 * Add file to chunk, if not presented there
										 */
										if (cachedFile !== file && chunk !== undefined) {
											chunk.auxiliaryFiles.add(cachedFile);
										}
									}

									reportProgress(
										(0.5 * ++fileIndex) / files.length,
										file,
										"restored cached SourceMap"
									);

									return callback();
								}

								reportProgress(
									(0.5 * fileIndex) / files.length,
									file,
									"generate SourceMap"
								);

								/** @type {SourceMapTask | undefined} */
								const task = getTaskForFile(
									file,
									asset.source,
									asset.info,
									{
										module: options.module,
										columns: options.columns
									},
									compilation,
									cacheItem,
									stash
								);

								if (task) {
									const modules = task.modules;

									for (let idx = 0; idx < modules.length; idx++) {
										const module = modules[idx];

										if (
											typeof module === "string" &&
											/^(?:data|https?):/.test(module)
										) {
											moduleToSourceNameMapping.set(module, module);
											continue;
										}

										if (!moduleToSourceNameMapping.get(module)) {
											moduleToSourceNameMapping.set(
												module,
												ModuleFilenameHelpers.createFilename(
													module,
													{
														moduleFilenameTemplate,
														namespace: sourceMapNamespace
													},
													{
														requestShortener,
														chunkGraph,
														hashFunction: compilation.outputOptions.hashFunction
													}
												)
											);
										}
									}

									tasks.push(task);
								}

								reportProgress(
									(0.5 * ++fileIndex) / files.length,
									file,
									"generated SourceMap"
								);

								callback();
							});
						},
						(err) => {
							if (err) {
								return callback(err);
							}

							reportProgress(0.5, "resolve sources");
							/** @type {Set<string>} */
							const usedNamesSet = new Set(moduleToSourceNameMapping.values());
							/** @type {Set<string>} */
							const conflictDetectionSet = new Set();

							/**
							 * all modules in defined order (longest identifier first)
							 * @type {(string | Module)[]}
							 */
							const allModules = [...moduleToSourceNameMapping.keys()].sort(
								(a, b) => {
									const ai = typeof a === "string" ? a : a.identifier();
									const bi = typeof b === "string" ? b : b.identifier();
									return ai.length - bi.length;
								}
							);

							// find modules with conflicting source names
							for (let idx = 0; idx < allModules.length; idx++) {
								const module = allModules[idx];
								let sourceName =
									/** @type {string} */
									(moduleToSourceNameMapping.get(module));
								let hasName = conflictDetectionSet.has(sourceName);
								if (!hasName) {
									conflictDetectionSet.add(sourceName);
									continue;
								}

								// try the fallback name first
								sourceName = ModuleFilenameHelpers.createFilename(
									module,
									{
										moduleFilenameTemplate: fallbackModuleFilenameTemplate,
										namespace
									},
									{
										requestShortener,
										chunkGraph,
										hashFunction: compilation.outputOptions.hashFunction
									}
								);
								hasName = usedNamesSet.has(sourceName);
								if (!hasName) {
									moduleToSourceNameMapping.set(module, sourceName);
									usedNamesSet.add(sourceName);
									continue;
								}

								// otherwise just append stars until we have a valid name
								while (hasName) {
									sourceName += "*";
									hasName = usedNamesSet.has(sourceName);
								}
								moduleToSourceNameMapping.set(module, sourceName);
								usedNamesSet.add(sourceName);
							}

							let taskIndex = 0;

							asyncLib.each(
								tasks,
								(task, callback) => {
									/** @type {Record<string, Source>} */
									const assets = Object.create(null);
									/** @type {Record<string, AssetInfo | undefined>} */
									const assetsInfo = Object.create(null);
									const file = task.file;
									const chunk = fileToChunk.get(file);
									const sourceMap = task.sourceMap;
									const source = task.source;
									const modules = task.modules;

									reportProgress(
										0.5 + (0.5 * taskIndex) / tasks.length,
										file,
										"attach SourceMap"
									);

									const moduleFilenames = modules.map((m) =>
										moduleToSourceNameMapping.get(m)
									);
									sourceMap.sources = /** @type {string[]} */ (moduleFilenames);
									if (options.ignoreList) {
										const ignoreList = sourceMap.sources.reduce(
											/** @type {(acc: number[], sourceName: string, idx: number) => number[]} */ (
												(acc, sourceName, idx) => {
													const rule = /** @type {Rules} */ (
														options.ignoreList
													);
													if (
														ModuleFilenameHelpers.matchPart(sourceName, rule)
													) {
														acc.push(idx);
													}
													return acc;
												}
											),
											[]
										);
										if (ignoreList.length > 0) {
											sourceMap.ignoreList = ignoreList;
										}
									}

									if (options.noSources) {
										sourceMap.sourcesContent = undefined;
									}
									sourceMap.sourceRoot = options.sourceRoot || "";
									sourceMap.file = file;
									const usesContentHash =
										sourceMapFilename &&
										CONTENT_HASH_DETECT_REGEXP.test(sourceMapFilename);

									resetRegexpState(CONTENT_HASH_DETECT_REGEXP);

									// If SourceMap and asset uses contenthash, avoid a circular dependency by hiding hash in `file`
									if (usesContentHash && task.assetInfo.contenthash) {
										const contenthash = task.assetInfo.contenthash;
										const pattern = Array.isArray(contenthash)
											? contenthash.map(quoteMeta).join("|")
											: quoteMeta(contenthash);
										sourceMap.file = sourceMap.file.replace(
											new RegExp(pattern, "g"),
											(m) => "x".repeat(m.length)
										);
									}

									/** @type {false | SourceMappingURLComment} */
									let currentSourceMappingURLComment = sourceMappingURLComment;
									const cssExtensionDetected =
										CSS_EXTENSION_DETECT_REGEXP.test(file);
									resetRegexpState(CSS_EXTENSION_DETECT_REGEXP);
									if (
										currentSourceMappingURLComment !== false &&
										typeof currentSourceMappingURLComment !== "function" &&
										cssExtensionDetected
									) {
										currentSourceMappingURLComment =
											currentSourceMappingURLComment.replace(
												URL_FORMATTING_REGEXP,
												"\n/*$1*/"
											);
									}

									if (options.debugIds) {
										const debugId = generateDebugId(source, sourceMap.file);
										sourceMap.debugId = debugId;

										const debugIdComment = `\n//# debugId=${debugId}`;
										currentSourceMappingURLComment =
											currentSourceMappingURLComment
												? `${debugIdComment}${currentSourceMappingURLComment}`
												: debugIdComment;
									}

									const sourceMapString = JSON.stringify(sourceMap);
									if (sourceMapFilename) {
										const filename = file;
										const sourceMapContentHash = usesContentHash
											? createHash(compilation.outputOptions.hashFunction)
													.update(sourceMapString)
													.digest("hex")
											: undefined;

										const pathParams = {
											chunk,
											filename: options.fileContext
												? relative(
														outputFs,
														`/${options.fileContext}`,
														`/${filename}`
													)
												: filename,
											contentHash: sourceMapContentHash
										};
										const { path: sourceMapFile, info: sourceMapInfo } =
											compilation.getPathWithInfo(
												sourceMapFilename,
												pathParams
											);
										const sourceMapUrl = options.publicPath
											? options.publicPath + sourceMapFile
											: relative(
													outputFs,
													dirname(outputFs, `/${file}`),
													`/${sourceMapFile}`
												);
										/** @type {Source} */
										let asset = new RawSource(source);
										if (currentSourceMappingURLComment !== false) {
											// Add source map url to compilation asset, if currentSourceMappingURLComment is set
											asset = new ConcatSource(
												asset,
												compilation.getPath(currentSourceMappingURLComment, {
													url: sourceMapUrl,
													...pathParams
												})
											);
										}
										// Preserve any existing related.sourceMap entries from
										// earlier SourceMapDevToolPlugin runs on the same asset so
										// that all generated maps remain discoverable via asset
										// info (the schema allows string or string[]).
										const existingSourceMap =
											task.assetInfo.related &&
											task.assetInfo.related.sourceMap;
										/** @type {string | string[]} */
										let relatedSourceMap;
										if (
											existingSourceMap === undefined ||
											existingSourceMap === null
										) {
											relatedSourceMap = sourceMapFile;
										} else if (Array.isArray(existingSourceMap)) {
											relatedSourceMap = existingSourceMap.includes(
												sourceMapFile
											)
												? existingSourceMap
												: [...existingSourceMap, sourceMapFile];
										} else {
											relatedSourceMap =
												existingSourceMap === sourceMapFile
													? existingSourceMap
													: [existingSourceMap, sourceMapFile];
										}
										const assetInfo = {
											related: { sourceMap: relatedSourceMap }
										};
										assets[file] = asset;
										assetsInfo[file] = assetInfo;
										compilation.updateAsset(file, asset, assetInfo);
										// Add source map file to compilation assets and chunk files
										const sourceMapAsset = new RawSource(sourceMapString);
										const sourceMapAssetInfo = {
											...sourceMapInfo,
											development: true
										};
										assets[sourceMapFile] = sourceMapAsset;
										assetsInfo[sourceMapFile] = sourceMapAssetInfo;
										compilation.emitAsset(
											sourceMapFile,
											sourceMapAsset,
											sourceMapAssetInfo
										);
										if (chunk !== undefined) {
											chunk.auxiliaryFiles.add(sourceMapFile);
										}
									} else {
										if (currentSourceMappingURLComment === false) {
											throw new Error(
												`${PLUGIN_NAME}: append can't be false when no filename is provided`
											);
										}
										if (typeof currentSourceMappingURLComment === "function") {
											throw new Error(
												`${PLUGIN_NAME}: append can't be a function when no filename is provided`
											);
										}
										/**
										 * Add source map as data url to asset
										 */
										const asset = new ConcatSource(
											new RawSource(source),
											currentSourceMappingURLComment
												.replace(MAP_URL_COMMENT_REGEXP, () => sourceMapString)
												.replace(
													URL_COMMENT_REGEXP,
													() =>
														`data:application/json;charset=utf-8;base64,${Buffer.from(
															sourceMapString,
															"utf8"
														).toString("base64")}`
												)
										);
										assets[file] = asset;
										assetsInfo[file] = undefined;
										compilation.updateAsset(file, asset);
									}

									task.cacheItem.store({ assets, assetsInfo }, (err) => {
										reportProgress(
											0.5 + (0.5 * ++taskIndex) / tasks.length,
											task.file,
											"attached SourceMap"
										);

										if (err) {
											return callback(err);
										}
										callback();
									});
								},
								(err) => {
									reportProgress(1);
									callback(err);
								}
							);
						}
					);
				}
			);
		});
	}
}

module.exports = SourceMapDevToolPlugin;
