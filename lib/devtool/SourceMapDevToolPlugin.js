/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const ProgressPlugin = require("../ProgressPlugin");
const { getPresentKinds } = require("../template/TemplatedPathPlugin");
const asyncLib = require("../util/async");
const createHash = require("../util/createHash");
const { dirname, relative } = require("../util/fs");
const generateDebugId = require("../util/generateDebugId");
const { makePathsAbsolute } = require("../util/identifier");
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

/** @import { MapOptions, Source, RawSourceMap } from "webpack-sources" */
/**
 * @import {
 * 	DevtoolNamespace,
 * 	DevtoolModuleFilenameTemplate,
 * 	DevtoolFallbackModuleFilenameTemplate
 * } from "../../declarations/WebpackOptions"
 */
/**
 * @import {
 * 	SourceMapDevToolPluginOptions,
 * 	Rules
 * } from "../../declarations/plugins/SourceMapDevToolPlugin"
 */
/** @import { ItemCacheFacade } from "../cache/CacheFacade" */
/** @import Chunk from "../graph/Chunk" */
/** @import { Asset, AssetInfo } from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../module/Module" */
/**
 * @import {
 * 	TemplatePath as SourceMappingURLComment
 * } from "../template/TemplatedPathPlugin"
 */
/** @import { OutputFileSystem } from "../util/fs" */

/**
 * Defines the source map task type used by this module.
 * @typedef {object} SourceMapTask
 * @property {AssetInfo} assetInfo
 * @property {(string | Module)[]} modules
 * @property {string} source
 * @property {string} file
 * @property {RawSourceMap} sourceMap
 * @property {Source} mapSource the Source instance whose `sourceAndMap` we called (the current asset or, when its map was already stripped, the pinned original from `originalSources`) — what `clearCache` should target
 * @property {InstanceType<ItemCacheFacade>} cacheItem cache item
 */

const METACHARACTERS_REGEXP = /[-[\]\\/{}()*+?.^$|]/g;
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
 * Compilation-scoped registry of original asset sources for multi-plugin
 * cooperation. The first SourceMapDevToolPlugin instance to see a file pins a
 * reference to the asset's still-unwrapped {@link Source} object; later
 * instances whose `asset.source.sourceAndMap()` would now return `null` (the
 * earlier instance replaced the asset with a `RawSource`) can re-extract the
 * map from this pinned reference. We keep the registry on a module-scoped
 * `WeakMap` so the entries are reclaimed automatically when the compilation
 * itself becomes unreachable; we never store anything on the compilation
 * object directly.
 *
 * Stashing the `Source` object itself rather than an extracted map keeps the
 * fast path free of cloning and source-map serialization work — the
 * extraction only happens if a subsequent plugin actually needs the map.
 * @type {WeakMap<Compilation, Map<string, Source>>}
 */
const originalSourceRegistry = new WeakMap();

/**
 * Returns (creating if necessary) the per-compilation registry of original
 * asset {@link Source} objects.
 * @param {Compilation} compilation compilation
 * @returns {Map<string, Source>} registry
 */
const getOriginalSourceRegistry = (compilation) => {
	let registry = originalSourceRegistry.get(compilation);
	if (registry === undefined) {
		registry = new Map();
		originalSourceRegistry.set(compilation, registry);
	}
	return registry;
};

/**
 * Extracts source and source map from a Source object, falling back to a
 * registered original source for assets that another SourceMapDevToolPlugin
 * instance has already wrapped (whose internal map is now `null`).
 *
 * The returned source is read from the asset as it currently stands — that way
 * any `sourceMappingURL` comments appended by earlier plugin instances survive
 * — while the map is taken from the pinned original Source when the current
 * one no longer carries it. `mapSource` identifies which Source instance was
 * actually queried for the map (the current asset, or the pinned original);
 * that's the one whose internal caches the caller should release.
 * @param {string} file file name
 * @param {Source} asset source object as currently held by the compilation
 * @param {MapOptions} options map extraction options
 * @param {Map<string, Source>} registry compilation-scoped original-source registry
 * @returns {{ source: string, sourceMap: RawSourceMap, mapSource: Source } | undefined} extracted pair or `undefined` when no map is recoverable
 */
const extractSourceAndMap = (file, asset, options, registry) => {
	/** @type {string | Buffer} */
	let source;
	/** @type {null | RawSourceMap} */
	let sourceMap;
	if (asset.sourceAndMap) {
		const sourceAndMap = asset.sourceAndMap(options);
		source = sourceAndMap.source;
		sourceMap = sourceAndMap.map;
	} else {
		source = asset.source();
		sourceMap = asset.map(options);
	}
	// Bail before touching the registry if we can't return a usable string
	// source — pinning a non-string-producing asset would only waste the slot.
	if (typeof source !== "string") return;
	if (sourceMap) {
		// The current asset still owns the original map — pin a reference so
		// that a later plugin instance (which will see a rewrapped asset
		// without a map) can recover it on demand.
		if (!registry.has(file)) registry.set(file, asset);
		return { source, sourceMap, mapSource: asset };
	}
	// The current asset, typically a `RawSource` an earlier instance left, has no
	// internal map, so re-extract one from the pinned original. `source` still
	// comes from the current asset, preserving any wrappers it gained.
	const original = registry.get(file);
	if (!original) return;
	sourceMap = original.sourceAndMap
		? original.sourceAndMap(options).map
		: original.map(options);
	if (!sourceMap) return;
	return { source, sourceMap, mapSource: original };
};

/**
 * Creating {@link SourceMapTask} for given file
 * @param {string} file current compiled file
 * @param {Source} asset the asset
 * @param {AssetInfo} assetInfo the asset info
 * @param {MapOptions} options source map options
 * @param {Compilation} compilation compilation instance
 * @param {InstanceType<ItemCacheFacade>} cacheItem cache item
 * @param {Map<string, Source>} registry compilation-scoped original-source registry
 * @returns {SourceMapTask | undefined} created task instance or `undefined`
 */
const getTaskForFile = (
	file,
	asset,
	assetInfo,
	options,
	compilation,
	cacheItem,
	registry
) => {
	const extracted = extractSourceAndMap(file, asset, options, registry);
	if (!extracted) return;
	const { source, sourceMap, mapSource } = extracted;
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
		source: /** @type {string} */ (source),
		assetInfo,
		sourceMap,
		mapSource,
		modules,
		cacheItem
	};
};

const PLUGIN_NAME = "SourceMapDevToolPlugin";

/**
 * Maps a configuration value (string, RegExp, function, nullish, or array of
 * such) into a JSON-serializable form. Functions and RegExps are turned into
 * their `.toString()` representation so that changes to inline callbacks
 * invalidate caches; everything else is returned as-is so that the surrounding
 * `JSON.stringify` does the escaping.
 *
 * The result is used through `JSON.stringify` to build cache identifiers, so
 * we deliberately avoid any homemade `|` / `,` separators that could collide
 * with characters appearing inside user-provided values such as `publicPath`,
 * template strings, or `sourceRoot`.
 * @param {EXPECTED_ANY} value option value
 * @returns {EXPECTED_ANY} JSON-serializable representation
 */
const toCacheKeyValue = (value) => {
	if (value === undefined || value === null) return value;
	if (Array.isArray(value)) return value.map(toCacheKeyValue);
	if (value instanceof RegExp || typeof value === "function") {
		return value.toString();
	}
	return value;
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
			options.moduleFilenameTemplate ||
			ModuleFilenameHelpers.DEFAULT_MODULE_FILENAME_TEMPLATE;
		/** @type {DevtoolFallbackModuleFilenameTemplate} */
		this.fallbackModuleFilenameTemplate =
			options.fallbackModuleFilenameTemplate ||
			ModuleFilenameHelpers.DEFAULT_FALLBACK_MODULE_FILENAME_TEMPLATE;
		/** @type {DevtoolNamespace} */
		this.namespace = options.namespace || "";
		/** @type {SourceMapDevToolPluginOptions} */
		this.options = options;
		// Salt from the output-affecting options, so two instances on the same asset
		// never share a cache entry. Serialized with `JSON.stringify` rather than a
		// separator, which a `|` in a publicPath could collide through.
		/** @type {string} */
		this._cacheSalt = JSON.stringify([
			toCacheKeyValue(options.filename),
			toCacheKeyValue(options.append),
			toCacheKeyValue(this.moduleFilenameTemplate),
			toCacheKeyValue(this.fallbackModuleFilenameTemplate),
			toCacheKeyValue(this.namespace),
			options.module !== false,
			options.columns !== false,
			Boolean(options.noSources),
			Boolean(options.debugIds),
			options.sourceRoot || "",
			toCacheKeyValue(options.ignoreList),
			options.publicPath || "",
			options.fileContext || ""
		]);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../../schemas/plugins/SourceMapDevToolPlugin.json"),
				this.options,
				{
					name: "SourceMap DevTool Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/SourceMapDevToolPlugin.check")(options)
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

			// Every instance on a compilation shares this registry of pristine
			// sources, so a later one still recovers the original map after the first
			// replaced the asset. Keyed by compilation, so it releases on its own.
			const originalSources = getOriginalSourceRegistry(compilation);

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

					// WHY: chunks share module-level `CachedSource` instances, so a
					// per-call set re-walks each shared subtree once per chunk and every
					// `sourceAndMap` then recomputes the cleared caches — measured at
					// +700 MB peak RSS and +6 s on a 50×1000 build. One shared set walks
					// each subtree once, at the cost of leaving at most one populated
					// cache entry per shared module, a few MB even at #20961's scale.
					const clearCacheVisited = new WeakSet();

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

							// WHY: the cache item identifier carries the per-instance salt, or
							// two SourceMapDevToolPlugin instances targeting the same `file`
							// would write different content to one key and invalidate every pack
							// on each build. `JSON.stringify` encodes it, so a special character
							// such as `|` in an asset filename cannot be spoofed to collide with
							// the salt portion.
							const cacheItem = cache.getItemCache(
								JSON.stringify([file, this._cacheSalt]),
								cache.mergeEtags(
									cache.getLazyHashedEtag(asset.source),
									sourceMapNamespace
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
									// Pin the still-unwrapped source before `updateAsset` replaces
									// it — a pointer assignment, no extraction — so a later
									// instance can still reach the original map past this cache hit.
									if (!originalSources.has(file)) {
										originalSources.set(file, asset.source);
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
									originalSources
								);

								// WHY: the map `sourceAndMap` just composed otherwise sits on
								// the CachedSource and every shared child until phase 2
								// replaces the asset, which is the OOM spike of webpack#20961
								// on builds with thousands of chunks. `source` is kept for
								// downstream consumers, `hash` and `size` because they are
								// cheap to hold and expensive to rebuild.
								//
								// `task.mapSource`, not `asset.source`: where the fallback to
								// the pinned original ran — the current asset being a
								// `RawSource` an earlier instance left — the original's caches
								// are the ones `extractSourceAndMap` populated.

								// Feature-detected, since `clearCache` landed in
								// `webpack-sources` 3.5 and a third-party plugin may hand us a
								// `Source` built against an older copy.
								if (task && typeof task.mapSource.clearCache === "function") {
									task.mapSource.clearCache(
										{
											maps: true,
											source: false,
											parsedMap: true
										},
										clearCacheVisited
									);
								}

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

									const moduleFilenames =
										/** @type {string[]} */
										(modules.map((m) => moduleToSourceNameMapping.get(m)));
									// `sourceMap` is never mutated in place: the reference may be
									// the same object a `SourceMapSource` has cached, so a second
									// instance reading through the registry would see the rewrites.
									/** @type {number[] | undefined} */
									let ignoreList;
									if (options.ignoreList) {
										const list = moduleFilenames.reduce(
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
										if (list.length > 0) ignoreList = list;
									}

									const usesContentHash =
										typeof sourceMapFilename === "string" &&
										getPresentKinds(sourceMapFilename).has("contenthash");

									let outputFile = file;
									// If SourceMap and asset uses contenthash, avoid a circular dependency by hiding hash in `file`
									if (usesContentHash && task.assetInfo.contenthash) {
										const contenthash = task.assetInfo.contenthash;
										const pattern = Array.isArray(contenthash)
											? contenthash.map(quoteMeta).join("|")
											: quoteMeta(contenthash);
										outputFile = outputFile.replace(
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

									/** @type {string | undefined} */
									let debugIdValue;
									if (options.debugIds) {
										const debugId = generateDebugId(source, outputFile);
										debugIdValue = debugId;

										const debugIdComment = `\n//# debugId=${debugId}`;
										if (currentSourceMappingURLComment === false) {
											currentSourceMappingURLComment = debugIdComment;
										} else if (
											typeof currentSourceMappingURLComment === "function"
										) {
											// Wrap the user's append function so the debug-id comment is
											// prepended at call time; concatenating would coerce the
											// function to a string and lose its behavior.
											const wrappedFn = currentSourceMappingURLComment;
											currentSourceMappingURLComment = (pathData, assetInfo) =>
												`${debugIdComment}${wrappedFn(pathData, assetInfo)}`;
										} else {
											currentSourceMappingURLComment = `${debugIdComment}${currentSourceMappingURLComment}`;
										}
									}

									/** @type {RawSourceMap} */
									const outputSourceMap = {
										...sourceMap,
										sources: moduleFilenames,
										sourceRoot: options.sourceRoot || "",
										file: outputFile
									};
									if (ignoreList !== undefined) {
										outputSourceMap.ignoreList = ignoreList;
									}
									if (options.noSources) {
										outputSourceMap.sourcesContent = undefined;
									}
									if (debugIdValue !== undefined) {
										outputSourceMap.debugId = debugIdValue;
									}

									if (sourceMapFilename) {
										// Hold the serialized map as a `Buffer`, which `RawSource`
										// takes directly: the asset lives in `compilation.assets`
										// until the build ends, and these bytes stay off the V8 heap.
										const sourceMapBuffer = Buffer.from(
											JSON.stringify(outputSourceMap),
											"utf8"
										);
										const filename = file;
										const sourceMapContentHash = usesContentHash
											? createHash(compilation.outputOptions.hashFunction)
													.update(sourceMapBuffer)
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
										// Preserve the `related.sourceMap` entries earlier runs left on
										// this asset, so every generated map stays discoverable; the
										// schema allows a string or an array.
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
										const sourceMapAsset = new RawSource(sourceMapBuffer);
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
										// Inline data-URL form: `[map]` takes the raw JSON and `[url]`
										// the same base64-encoded. Both are precomputed, or a template
										// with two `[url]`s would re-encode per match.
										const sourceMapString = JSON.stringify(outputSourceMap);
										const sourceMapBase64 = Buffer.from(
											sourceMapString,
											"utf8"
										).toString("base64");
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
														`data:application/json;charset=utf-8;base64,${sourceMapBase64}`
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
