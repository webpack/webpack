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
const { getPresentKinds } = require("./TemplatedPathPlugin");
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
 * @property {AssetInfo} assetInfo
 * @property {(string | Module)[]} modules
 * @property {string} source
 * @property {string} file
 * @property {RawSourceMap} sourceMap
 * @property {Source} mapSource the Source instance whose `sourceAndMap` we called (the current asset or, when its map was already stripped, the pinned original from `originalSources`) — what `clearCache` should target
 * @property {ItemCacheFacade} cacheItem cache item
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
	// The current asset (typically a `RawSource` left by an earlier
	// SourceMapDevToolPlugin instance) has no internal map. Re-extract
	// the map from the original Source we pinned earlier. We keep using
	// `source` from the current asset so that any prior wrappers (e.g.
	// appended sourceMappingURL comments) are preserved.
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
 * @param {ItemCacheFacade} cacheItem cache item
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
		// on the same asset don't share a cache entry. We serialize via
		// `JSON.stringify` rather than a homemade separator so that any
		// special characters (e.g. `|` inside a publicPath or sourceRoot)
		// can't accidentally make two different option sets collide.
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

			// All SourceMapDevToolPlugin instances on the same compilation share
			// a registry of pristine asset sources, so the second instance to
			// run can still recover the original map after the first instance
			// has replaced the asset with a `RawSource`. The registry lives on a
			// module-scoped `WeakMap` keyed by compilation so it is released
			// automatically and never pollutes the compilation object.
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

					// Shared deduplication set for `Source#clearCache` calls below.
					// Webpack chunks routinely share module-level `CachedSource`
					// instances. A per-call WeakSet would re-walk those shared
					// subtrees once per chunk — 50 chunks × thousands of shared
					// modules in dev/non-minified setups — and worse, every
					// chunk's `sourceAndMap` would have to recompute the cleared
					// caches, churning allocations (measured: +700 MB peak RSS,
					// +6 s wall time on a 50×1000 synthetic build).
					//
					// Sharing one set lets each shared subtree be walked exactly
					// once. The trade-off is that subsequent chunks' `sourceAndMap`
					// calls can repopulate a shared module's `_cachedMaps` after
					// its own clear was skipped (because the module is already in
					// the visited set), leaving at most one populated cache entry
					// per shared module at the end of the run — bounded to a few
					// MB even at the scale of #20961. That's strictly preferable
					// to the alternative's hundreds of MB of transient peak RSS.
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

							// The cache item identifier must include the per-instance
							// salt so two SourceMapDevToolPlugin instances that target
							// the same `file` don't collide in the persistent cache —
							// they'd otherwise write different content to the same key
							// and invalidate every pack on each build. We encode via
							// `JSON.stringify` so that special characters (e.g. `|`)
							// in an asset filename can't be spoofed to collide with the
							// salt portion of the identifier.
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
									// Pin the still-unwrapped asset source in the registry
									// before `compilation.updateAsset` replaces it. This is a
									// pointer assignment — no source-map extraction work — and
									// it lets a subsequent SourceMapDevToolPlugin instance
									// extract the original map on demand even though the
									// persistent cache hit lets us skip processing here.
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

								// Release the per-instance caches that `sourceAndMap`
								// just populated. The composed map (and, for
								// `SourceMapSource`, the parsed `_sourceMapAsObject` /
								// `_innerSourceMapAsObject`) otherwise sit on the
								// CachedSource — and every shared child — until phase
								// 2 replaces the asset, which is what causes the OOM
								// spike on builds with thousands of chunks
								// (webpack#20961). Keep `source` since downstream
								// consumers reading the original asset still need it;
								// `hash`/`size` default to retained because they're
								// cheap to keep but expensive to rebuild.
								// `clearCacheVisited` is shared across every call (see
								// its declaration above for the rationale).
								//
								// Target `task.mapSource` (not `asset.source`): when
								// `extractSourceAndMap` falls back to the pinned
								// original (the current asset is a `RawSource` left
								// by an earlier plugin instance), the `sourceAndMap`
								// call populated the original's caches, not the
								// current asset's.
								//
								// Feature-detected: `clearCache` landed in
								// `webpack-sources` 3.5, but `compilation.assets` may
								// hold `Source`-like instances from a third-party
								// plugin built against an older copy of
								// `webpack-sources` (or a hand-rolled implementation).
								// Calling it unconditionally would throw on those.
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
									// We deliberately do NOT mutate `sourceMap` in place: the
									// task's `sourceMap` reference may be shared with a
									// `SourceMapSource` whose internal map cache is the same
									// object (webpack-sources keeps it cached). A second
									// `SourceMapDevToolPlugin` instance that reads the original
									// source through the registry would otherwise see our
									// rewrites. Instead we build a fresh `outputSourceMap` for
									// the .map file and leave the original alone.
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
											// Wrap the user's append function so the debug-id
											// comment is prepended at call time. Template-string
											// concatenation would coerce the function to a string
											// and lose its dynamic behavior.
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
										// External `.map` file: hold the serialized map as a
										// `Buffer` instead of a V8 string. `RawSource` accepts
										// a buffer directly, and the emitted asset stays in
										// `compilation.assets` until the build finishes — so
										// storing the bytes off the V8 heap (where Buffers
										// live, accounted as `external` memory) avoids keeping
										// a large V8 string alive for the rest of the build
										// and reduces heap pressure on `--max-old-space-size`.
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
										// Inline data-URL form: `[map]` gets the raw JSON, `[url]`
										// gets the same JSON base64-encoded. `URL_COMMENT_REGEXP`
										// is a `/g` regex, so a user `append` template with more
										// than one `[url]` placeholder would otherwise re-encode
										// the same JSON per match. Pre-compute both once.
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
