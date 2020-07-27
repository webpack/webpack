/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_ADVANCED } = require("../OptimizationStages");
const WebpackError = require("../WebpackError");
const { requestToId } = require("../ids/IdHelpers");
const { isSubset } = require("../util/SetHelpers");
const SortableSet = require("../util/SortableSet");
const {
	compareModulesByIdentifier,
	compareIterables
} = require("../util/comparators");
const createHash = require("../util/createHash");
const deterministicGrouping = require("../util/deterministicGrouping");
const contextify = require("../util/identifier").contextify;
const memorize = require("../util/memorize");
const MinMaxSizeWarning = require("./MinMaxSizeWarning");

/** @typedef {import("../../declarations/WebpackOptions").OptimizationSplitChunksCacheGroup} OptimizationSplitChunksCacheGroup */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationSplitChunksGetCacheGroups} OptimizationSplitChunksGetCacheGroups */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationSplitChunksOptions} OptimizationSplitChunksOptions */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationSplitChunksSizes} OptimizationSplitChunksSizes */
/** @typedef {import("../../declarations/WebpackOptions").Output} OutputOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation").AssetInfo} AssetInfo */
/** @typedef {import("../Compilation").PathData} PathData */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/deterministicGrouping").GroupedItems<Module>} DeterministicGroupingGroupedItemsForModule */
/** @typedef {import("../util/deterministicGrouping").Options<Module>} DeterministicGroupingOptionsForModule */

/** @typedef {Record<string, number>} SplitChunksSizes */

/**
 * @callback ChunkFilterFunction
 * @param {Chunk} chunk
 * @returns {boolean}
 */

/**
 * @callback CombineSizeFunction
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */

/**
 * @typedef {Object} CacheGroupSource
 * @property {string=} key
 * @property {number=} priority
 * @property {GetName=} getName
 * @property {ChunkFilterFunction=} chunksFilter
 * @property {boolean=} enforce
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {number=} minChunks
 * @property {number=} maxAsyncRequests
 * @property {number=} maxInitialRequests
 * @property {(string | function(PathData, AssetInfo=): string)=} filename
 * @property {string=} idHint
 * @property {string} automaticNameDelimiter
 * @property {boolean=} reuseExistingChunk
 * @property {boolean=} usedExports
 */

/**
 * @typedef {Object} CacheGroup
 * @property {string} key
 * @property {number=} priority
 * @property {GetName=} getName
 * @property {ChunkFilterFunction=} chunksFilter
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {number=} minChunks
 * @property {number=} maxAsyncRequests
 * @property {number=} maxInitialRequests
 * @property {(string | function(PathData, AssetInfo=): string)=} filename
 * @property {string=} idHint
 * @property {string} automaticNameDelimiter
 * @property {boolean} reuseExistingChunk
 * @property {boolean} usedExports
 * @property {boolean} _validateSize
 * @property {boolean} _validateRemainingSize
 * @property {SplitChunksSizes} _minSizeForMaxSize
 * @property {boolean} _conditionalEnforce
 */

/**
 * @typedef {Object} FallbackCacheGroup
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {string} automaticNameDelimiter
 */

/**
 * @typedef {Object} CacheGroupsContext
 * @property {ModuleGraph} moduleGraph
 * @property {ChunkGraph} chunkGraph
 */

/**
 * @callback GetCacheGroups
 * @param {Module} module
 * @param {CacheGroupsContext} context
 * @returns {CacheGroupSource[]}
 */

/**
 * @callback GetName
 * @param {Module=} module
 * @param {Chunk[]=} chunks
 * @param {string=} key
 * @returns {string=}
 */

/**
 * @typedef {Object} SplitChunksOptions
 * @property {ChunkFilterFunction} chunksFilter
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxInitialSize
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {number} minChunks
 * @property {number} maxAsyncRequests
 * @property {number} maxInitialRequests
 * @property {boolean} hidePathInfo
 * @property {string | function(PathData, AssetInfo=): string} filename
 * @property {string} automaticNameDelimiter
 * @property {GetCacheGroups} getCacheGroups
 * @property {GetName} getName
 * @property {boolean} usedExports
 * @property {FallbackCacheGroup} fallbackCacheGroup
 */

/**
 * @typedef {Object} ChunksInfoItem
 * @property {SortableSet<Module>} modules
 * @property {CacheGroup} cacheGroup
 * @property {number} cacheGroupIndex
 * @property {string} name
 * @property {Record<string, number>} sizes
 * @property {Set<Chunk>} chunks
 * @property {Set<Chunk>} reuseableChunks
 * @property {Set<bigint>} chunksKeys
 */

const defaultGetName = /** @type {GetName} */ (() => {});

const deterministicGroupingForModules = /** @type {function(DeterministicGroupingOptionsForModule): DeterministicGroupingGroupedItemsForModule[]} */ (deterministicGrouping);

/** @type {WeakMap<Module, string>} */
const getKeyCache = new WeakMap();

/**
 * @param {string} name a filename to hash
 * @param {OutputOptions} outputOptions hash function used
 * @returns {string} hashed filename
 */
const hashFilename = (name, outputOptions) => {
	const digest = /** @type {string} */ (createHash(outputOptions.hashFunction)
		.update(name)
		.digest(outputOptions.hashDigest));
	return digest.slice(0, 8);
};

/**
 * @param {Chunk} chunk the chunk
 * @returns {number} the number of requests
 */
const getRequests = chunk => {
	let requests = 0;
	for (const chunkGroup of chunk.groupsIterable) {
		requests = Math.max(requests, chunkGroup.chunks.length);
	}
	return requests;
};

const mapObject = (obj, fn) => {
	const newObj = Object.create(null);
	for (const key of Object.keys(obj)) {
		newObj[key] = fn(obj[key], key);
	}
	return newObj;
};

/**
 * @template T
 * @param {Set<T>} a set
 * @param {Set<T>} b other set
 * @returns {boolean} true if at least one item of a is in b
 */
const isOverlap = (a, b) => {
	for (const item of a) {
		if (b.has(item)) return true;
	}
	return false;
};

const compareModuleIterables = compareIterables(compareModulesByIdentifier);

/**
 * @param {ChunksInfoItem} a item
 * @param {ChunksInfoItem} b item
 * @returns {number} compare result
 */
const compareEntries = (a, b) => {
	// 1. by priority
	const diffPriority = a.cacheGroup.priority - b.cacheGroup.priority;
	if (diffPriority) return diffPriority;
	// 2. by number of chunks
	const diffCount = a.chunks.size - b.chunks.size;
	if (diffCount) return diffCount;
	// 3. by size reduction
	const aSizeReduce = totalSize(a.sizes) * (a.chunks.size - 1);
	const bSizeReduce = totalSize(b.sizes) * (b.chunks.size - 1);
	const diffSizeReduce = aSizeReduce - bSizeReduce;
	if (diffSizeReduce) return diffSizeReduce;
	// 4. by cache group index
	const indexDiff = a.cacheGroupIndex - b.cacheGroupIndex;
	if (indexDiff) return indexDiff;
	// 5. by number of modules (to be able to compare by identifier)
	const modulesA = a.modules;
	const modulesB = b.modules;
	const diff = modulesA.size - modulesB.size;
	if (diff) return diff;
	// 6. by module identifiers
	modulesA.sort();
	modulesB.sort();
	return compareModuleIterables(modulesA, modulesB);
};

const INITIAL_CHUNK_FILTER = chunk => chunk.canBeInitial();
const ASYNC_CHUNK_FILTER = chunk => !chunk.canBeInitial();
const ALL_CHUNK_FILTER = chunk => true;

/**
 * @param {OptimizationSplitChunksSizes} value the sizes
 * @returns {SplitChunksSizes} normalized representation
 */
const normalizeSizes = value => {
	if (typeof value === "number") {
		return {
			javascript: value,
			unknown: value
		};
	} else if (typeof value === "object" && value !== null) {
		return { ...value };
	} else {
		return {};
	}
};

/**
 * @param {...OptimizationSplitChunksSizes} sizes the sizes
 * @returns {SplitChunksSizes} the merged sizes
 */
const mergeSizes = (...sizes) => {
	/** @type {SplitChunksSizes} */
	let merged = {};
	for (let i = sizes.length - 1; i >= 0; i--) {
		merged = Object.assign(merged, normalizeSizes(sizes[i]));
	}
	return merged;
};

/**
 * @param {SplitChunksSizes} sizes the sizes
 * @returns {boolean} true, if there are sizes > 0
 */
const hasNonZeroSizes = sizes => {
	for (const key of Object.keys(sizes)) {
		if (sizes[key] > 0) return true;
	}
	return false;
};

/**
 * @param {SplitChunksSizes} a first sizes
 * @param {SplitChunksSizes} b second sizes
 * @param {CombineSizeFunction} combine a function to combine sizes
 * @returns {SplitChunksSizes} the combine sizes
 */
const combineSizes = (a, b, combine) => {
	const aKeys = new Set(Object.keys(a));
	const bKeys = new Set(Object.keys(b));
	/** @type {SplitChunksSizes} */
	const result = {};
	for (const key of aKeys) {
		if (bKeys.has(key)) {
			result[key] = combine(a[key], b[key]);
		} else {
			result[key] = a[key];
		}
	}
	for (const key of bKeys) {
		if (!aKeys.has(key)) {
			result[key] = b[key];
		}
	}
	return result;
};

/**
 * @param {SplitChunksSizes} sizes the sizes
 * @param {SplitChunksSizes} minSize the min sizes
 * @returns {boolean} true if there are sizes and all existing sizes are at least `minSize`
 */
const checkMinSize = (sizes, minSize) => {
	for (const key of Object.keys(minSize)) {
		const size = sizes[key];
		if (size === undefined || size === 0) continue;
		if (size < minSize[key]) return false;
	}
	return true;
};

/**
 * @param {SplitChunksSizes} sizes the sizes
 * @returns {number} the total size
 */
const totalSize = sizes => {
	let size = 0;
	for (const key of Object.keys(sizes)) {
		size += sizes[key];
	}
	return size;
};

/**
 * @param {false|string|Function} name the chunk name
 * @returns {GetName} a function to get the name of the chunk
 */
const normalizeName = name => {
	if (typeof name === "string") {
		return () => name;
	}
	if (typeof name === "function") {
		return /** @type {GetName} */ (name);
	}
};

/**
 * @param {OptimizationSplitChunksCacheGroup["chunks"]} chunks the chunk filter option
 * @returns {ChunkFilterFunction} the chunk filter function
 */
const normalizeChunksFilter = chunks => {
	if (chunks === "initial") {
		return INITIAL_CHUNK_FILTER;
	}
	if (chunks === "async") {
		return ASYNC_CHUNK_FILTER;
	}
	if (chunks === "all") {
		return ALL_CHUNK_FILTER;
	}
	if (typeof chunks === "function") {
		return chunks;
	}
};

/**
 * @param {GetCacheGroups | Record<string, false|string|RegExp|OptimizationSplitChunksGetCacheGroups|OptimizationSplitChunksCacheGroup>} cacheGroups the cache group options
 * @returns {GetCacheGroups} a function to get the cache groups
 */
const normalizeCacheGroups = cacheGroups => {
	if (typeof cacheGroups === "function") {
		return cacheGroups;
	}
	if (typeof cacheGroups === "object" && cacheGroups !== null) {
		/** @type {(function(Module, CacheGroupsContext, CacheGroupSource[]): void)[]} */
		const handlers = [];
		for (const key of Object.keys(cacheGroups)) {
			const option = cacheGroups[key];
			if (option === false) {
				continue;
			}
			if (typeof option === "string" || option instanceof RegExp) {
				const source = createCacheGroupSource({}, key);
				handlers.push((module, context, results) => {
					if (checkTest(option, module, context)) {
						results.push(source);
					}
				});
			} else if (typeof option === "function") {
				handlers.push((module, context, results) => {
					const result = option(module);
					if (result) {
						const groups = Array.isArray(result) ? result : [result];
						for (const group of groups) {
							results.push(createCacheGroupSourceCached(group, key));
						}
					}
				});
			} else {
				const source = createCacheGroupSource(option, key);
				handlers.push((module, context, results) => {
					if (
						checkTest(option.test, module, context) &&
						checkModuleType(option.type, module)
					) {
						results.push(source);
					}
				});
			}
		}
		/**
		 * @param {Module} module the current module
		 * @param {CacheGroupsContext} context the current context
		 * @returns {CacheGroupSource[]} the matching cache groups
		 */
		const fn = (module, context) => {
			/** @type {CacheGroupSource[]} */
			let results = [];
			for (const fn of handlers) {
				fn(module, context, results);
			}
			return results;
		};
		return fn;
	}
	return () => null;
};

/**
 * @param {undefined|boolean|string|RegExp|Function} test test option
 * @param {Module} module the module
 * @param {CacheGroupsContext} context context object
 * @returns {boolean} true, if the module should be selected
 */
const checkTest = (test, module, context) => {
	if (test === undefined) return true;
	if (typeof test === "function") {
		return test(module, context);
	}
	if (typeof test === "boolean") return test;
	if (typeof test === "string") {
		const name = module.nameForCondition();
		return name && name.startsWith(test);
	}
	if (test instanceof RegExp) {
		const name = module.nameForCondition();
		return name && test.test(name);
	}
	return false;
};

/**
 * @param {undefined|string|RegExp|Function} test type option
 * @param {Module} module the module
 * @returns {boolean} true, if the module should be selected
 */
const checkModuleType = (test, module) => {
	if (test === undefined) return true;
	if (typeof test === "function") {
		return test(module.type);
	}
	if (typeof test === "string") {
		const type = module.type;
		return test === type;
	}
	if (test instanceof RegExp) {
		const type = module.type;
		return test.test(type);
	}
	return false;
};

/**
 * @typedef {Object} CacheGroupKey
 * @property {string} key
 */

const cacheGroupSourceCache = new WeakMap();

/**
 * @param {OptimizationSplitChunksCacheGroup} options the group options
 * @param {string} key key of cache group
 * @returns {CacheGroupSource} the normalized cached group
 */
const createCacheGroupSourceCached = (options, key) => {
	let cacheMap = cacheGroupSourceCache.get(options);
	if (cacheMap !== undefined) {
		const cacheEntry = cacheMap.get(key);
		if (cacheEntry !== undefined) return cacheEntry;
	} else {
		cacheMap = new Map();
		cacheGroupSourceCache.set(options, cacheMap);
	}
	const result = createCacheGroupSource(options, key);
	cacheMap.set(key, result);
	return result;
};

/**
 * @param {OptimizationSplitChunksCacheGroup} options the group options
 * @param {string} key key of cache group
 * @returns {CacheGroupSource} the normalized cached group
 */
const createCacheGroupSource = (options, key) => {
	return {
		key,
		priority: options.priority,
		getName: normalizeName(options.name),
		chunksFilter: normalizeChunksFilter(options.chunks),
		enforce: options.enforce,
		minSize: normalizeSizes(options.minSize),
		minRemainingSize: mergeSizes(options.minRemainingSize, options.minSize),
		enforceSizeThreshold: normalizeSizes(options.enforceSizeThreshold),
		maxAsyncSize: mergeSizes(options.maxAsyncSize, options.maxSize),
		maxInitialSize: mergeSizes(options.maxInitialSize, options.maxSize),
		minChunks: options.minChunks,
		maxAsyncRequests: options.maxAsyncRequests,
		maxInitialRequests: options.maxInitialRequests,
		filename: options.filename,
		idHint: options.idHint,
		automaticNameDelimiter: options.automaticNameDelimiter,
		reuseExistingChunk: options.reuseExistingChunk,
		usedExports: options.usedExports
	};
};

module.exports = class SplitChunksPlugin {
	/**
	 * @param {OptimizationSplitChunksOptions=} options plugin options
	 */
	constructor(options = {}) {
		const fallbackCacheGroup = options.fallbackCacheGroup || {};

		/** @type {SplitChunksOptions} */
		this.options = {
			chunksFilter: normalizeChunksFilter(options.chunks || "all"),
			minSize: normalizeSizes(options.minSize),
			minRemainingSize: mergeSizes(options.minRemainingSize, options.minSize),
			enforceSizeThreshold: normalizeSizes(options.enforceSizeThreshold),
			maxAsyncSize: mergeSizes(options.maxAsyncSize, options.maxSize),
			maxInitialSize: mergeSizes(options.maxInitialSize, options.maxSize),
			minChunks: options.minChunks || 1,
			maxAsyncRequests: options.maxAsyncRequests || 1,
			maxInitialRequests: options.maxInitialRequests || 1,
			hidePathInfo: options.hidePathInfo || false,
			filename: options.filename || undefined,
			getCacheGroups: normalizeCacheGroups(options.cacheGroups),
			getName: options.name ? normalizeName(options.name) : defaultGetName,
			automaticNameDelimiter: options.automaticNameDelimiter,
			usedExports: options.usedExports,
			fallbackCacheGroup: {
				minSize: mergeSizes(fallbackCacheGroup.minSize, options.minSize),
				maxAsyncSize: mergeSizes(
					fallbackCacheGroup.maxAsyncSize,
					fallbackCacheGroup.maxSize,
					options.maxAsyncSize,
					options.maxSize
				),
				maxInitialSize: mergeSizes(
					fallbackCacheGroup.maxInitialSize,
					fallbackCacheGroup.maxSize,
					options.maxInitialSize,
					options.maxSize
				),
				automaticNameDelimiter:
					fallbackCacheGroup.automaticNameDelimiter ||
					options.automaticNameDelimiter ||
					"~"
			}
		};

		/** @type {WeakMap<CacheGroupSource, CacheGroup>} */
		this._cacheGroupCache = new WeakMap();
	}

	/**
	 * @param {CacheGroupSource} cacheGroupSource source
	 * @returns {CacheGroup} the cache group (cached)
	 */
	_getCacheGroup(cacheGroupSource) {
		const cacheEntry = this._cacheGroupCache.get(cacheGroupSource);
		if (cacheEntry !== undefined) return cacheEntry;
		const minSize = mergeSizes(
			cacheGroupSource.minSize,
			cacheGroupSource.enforce ? undefined : this.options.minSize
		);
		const minRemainingSize = mergeSizes(
			cacheGroupSource.minRemainingSize,
			cacheGroupSource.enforce ? undefined : this.options.minRemainingSize
		);
		const enforceSizeThreshold = mergeSizes(
			cacheGroupSource.enforceSizeThreshold,
			cacheGroupSource.enforce ? undefined : this.options.enforceSizeThreshold
		);
		const cacheGroup = {
			key: cacheGroupSource.key,
			priority: cacheGroupSource.priority || 0,
			chunksFilter: cacheGroupSource.chunksFilter || this.options.chunksFilter,
			minSize,
			minRemainingSize,
			enforceSizeThreshold,
			maxAsyncSize: mergeSizes(
				cacheGroupSource.maxAsyncSize,
				cacheGroupSource.enforce ? undefined : this.options.maxAsyncSize
			),
			maxInitialSize: mergeSizes(
				cacheGroupSource.maxInitialSize,
				cacheGroupSource.enforce ? undefined : this.options.maxInitialSize
			),
			minChunks:
				cacheGroupSource.minChunks !== undefined
					? cacheGroupSource.minChunks
					: cacheGroupSource.enforce
					? 1
					: this.options.minChunks,
			maxAsyncRequests:
				cacheGroupSource.maxAsyncRequests !== undefined
					? cacheGroupSource.maxAsyncRequests
					: cacheGroupSource.enforce
					? Infinity
					: this.options.maxAsyncRequests,
			maxInitialRequests:
				cacheGroupSource.maxInitialRequests !== undefined
					? cacheGroupSource.maxInitialRequests
					: cacheGroupSource.enforce
					? Infinity
					: this.options.maxInitialRequests,
			getName:
				cacheGroupSource.getName !== undefined
					? cacheGroupSource.getName
					: this.options.getName,
			usedExports:
				cacheGroupSource.usedExports !== undefined
					? cacheGroupSource.usedExports
					: this.options.usedExports,
			filename:
				cacheGroupSource.filename !== undefined
					? cacheGroupSource.filename
					: this.options.filename,
			automaticNameDelimiter:
				cacheGroupSource.automaticNameDelimiter !== undefined
					? cacheGroupSource.automaticNameDelimiter
					: this.options.automaticNameDelimiter,
			idHint:
				cacheGroupSource.idHint !== undefined
					? cacheGroupSource.idHint
					: cacheGroupSource.key,
			reuseExistingChunk: cacheGroupSource.reuseExistingChunk || false,
			_validateSize: hasNonZeroSizes(minSize),
			_validateRemainingSize: hasNonZeroSizes(minRemainingSize),
			_minSizeForMaxSize: mergeSizes(
				cacheGroupSource.minSize,
				this.options.minSize
			),
			_conditionalEnforce: hasNonZeroSizes(enforceSizeThreshold)
		};
		this._cacheGroupCache.set(cacheGroupSource, cacheGroup);
		return cacheGroup;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cachedContextify = contextify.bindContextCache(
			compiler.context,
			compiler.root
		);
		compiler.hooks.thisCompilation.tap("SplitChunksPlugin", compilation => {
			const logger = compilation.getLogger("webpack.SplitChunksPlugin");
			let alreadyOptimized = false;
			compilation.hooks.unseal.tap("SplitChunksPlugin", () => {
				alreadyOptimized = false;
			});
			compilation.hooks.optimizeChunks.tap(
				{
					name: "SplitChunksPlugin",
					stage: STAGE_ADVANCED
				},
				chunks => {
					if (alreadyOptimized) return;
					alreadyOptimized = true;
					logger.time("prepare");
					const chunkGraph = compilation.chunkGraph;
					const moduleGraph = compilation.moduleGraph;
					// Give each selected chunk an index (to create strings from chunks)
					/** @type {Map<Chunk, bigint>} */
					const chunkIndexMap = new Map();
					const ZERO = BigInt("0");
					const ONE = BigInt("1");
					let index = ONE;
					for (const chunk of chunks) {
						chunkIndexMap.set(chunk, index);
						index = index << ONE;
					}
					/**
					 * @param {Iterable<Chunk>} chunks list of chunks
					 * @returns {bigint} key of the chunks
					 */
					const getKey = chunks => {
						let key = ZERO;
						for (const c of chunks) {
							key = key | chunkIndexMap.get(c);
						}
						return key;
					};

					const getChunkSetsInGraph = memorize(() => {
						/** @type {Map<bigint, Set<Chunk>>} */
						const chunkSetsInGraph = new Map();
						for (const module of compilation.modules) {
							const chunksKey = getKey(
								chunkGraph.getModuleChunksIterable(module)
							);
							if (!chunkSetsInGraph.has(chunksKey)) {
								chunkSetsInGraph.set(
									chunksKey,
									new Set(chunkGraph.getModuleChunksIterable(module))
								);
							}
						}
						return chunkSetsInGraph;
					});

					/**
					 * @param {Module} module the module
					 * @returns {Iterable<Chunk[]>} groups of chunks with equal exports
					 */
					const groupChunksByExports = module => {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						const groupedByUsedExports = new Map();
						for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
							const key = exportsInfo.getUsageKey(chunk.runtime);
							const list = groupedByUsedExports.get(key);
							if (list !== undefined) {
								list.push(chunk);
							} else {
								groupedByUsedExports.set(key, [chunk]);
							}
						}
						return groupedByUsedExports.values();
					};

					/** @type {Map<Module, Iterable<Chunk[]>>} */
					const groupedByExportsMap = new Map();

					const getExportsChunkSetsInGraph = memorize(() => {
						/** @type {Map<bigint, Set<Chunk>>} */
						const chunkSetsInGraph = new Map();
						for (const module of compilation.modules) {
							const groupedChunks = Array.from(groupChunksByExports(module));
							groupedByExportsMap.set(module, groupedChunks);
							for (const chunks of groupedChunks) {
								const chunksKey = getKey(chunks);
								if (!chunkSetsInGraph.has(chunksKey)) {
									chunkSetsInGraph.set(chunksKey, new Set(chunks));
								}
							}
						}
						return chunkSetsInGraph;
					});

					// group these set of chunks by count
					// to allow to check less sets via isSubset
					// (only smaller sets can be subset)
					const groupChunkSetsByCount = chunkSets => {
						/** @type {Map<number, Array<Set<Chunk>>>} */
						const chunkSetsByCount = new Map();
						for (const chunksSet of chunkSets) {
							const count = chunksSet.size;
							let array = chunkSetsByCount.get(count);
							if (array === undefined) {
								array = [];
								chunkSetsByCount.set(count, array);
							}
							array.push(chunksSet);
						}
						return chunkSetsByCount;
					};
					const getChunkSetsByCount = memorize(() =>
						groupChunkSetsByCount(getChunkSetsInGraph().values())
					);
					const getExportsChunkSetsByCount = memorize(() =>
						groupChunkSetsByCount(getExportsChunkSetsInGraph().values())
					);

					// Create a list of possible combinations
					const createGetCombinations = (chunkSets, chunkSetsByCount) => {
						/** @type {Map<bigint, Set<Chunk>[]>} */
						const combinationsCache = new Map();

						return key => {
							const cacheEntry = combinationsCache.get(key);
							if (cacheEntry !== undefined) return cacheEntry;
							const chunksSet = chunkSets.get(key);
							/** @type {Set<Chunk>[]} */
							var array = [chunksSet];
							if (chunksSet.size > 1) {
								for (const [count, setArray] of chunkSetsByCount) {
									// "equal" is not needed because they would have been merge in the first step
									if (count < chunksSet.size) {
										for (const set of setArray) {
											if (isSubset(chunksSet, set)) {
												array.push(set);
											}
										}
									}
								}
							}
							combinationsCache.set(key, array);
							return array;
						};
					};

					const getCombinationsFactory = memorize(() =>
						createGetCombinations(getChunkSetsInGraph(), getChunkSetsByCount())
					);
					const getCombinations = key => getCombinationsFactory()(key);

					const getExportsCombinationsFactory = memorize(() =>
						createGetCombinations(
							getExportsChunkSetsInGraph(),
							getExportsChunkSetsByCount()
						)
					);
					const getExportsCombinations = key =>
						getExportsCombinationsFactory()(key);

					/**
					 * @typedef {Object} SelectedChunksResult
					 * @property {Chunk[]} chunks the list of chunks
					 * @property {bigint} key a key of the list
					 */

					/** @type {WeakMap<Set<Chunk>, WeakMap<ChunkFilterFunction, SelectedChunksResult>>} */
					const selectedChunksCacheByChunksSet = new WeakMap();

					/**
					 * get list and key by applying the filter function to the list
					 * It is cached for performance reasons
					 * @param {Set<Chunk>} chunks list of chunks
					 * @param {ChunkFilterFunction} chunkFilter filter function for chunks
					 * @returns {SelectedChunksResult} list and key
					 */
					const getSelectedChunks = (chunks, chunkFilter) => {
						let entry = selectedChunksCacheByChunksSet.get(chunks);
						if (entry === undefined) {
							entry = new WeakMap();
							selectedChunksCacheByChunksSet.set(chunks, entry);
						}
						/** @type {SelectedChunksResult} */
						let entry2 = entry.get(chunkFilter);
						if (entry2 === undefined) {
							/** @type {Chunk[]} */
							const selectedChunks = [];
							for (const chunk of chunks) {
								if (chunkFilter(chunk)) selectedChunks.push(chunk);
							}
							entry2 = {
								chunks: selectedChunks,
								key: getKey(selectedChunks)
							};
							entry.set(chunkFilter, entry2);
						}
						return entry2;
					};

					/** @type {Set<string>} */
					const alreadyValidatedNames = new Set();

					// Map a list of chunks to a list of modules
					// For the key the chunk "index" is used, the value is a SortableSet of modules
					/** @type {Map<string, ChunksInfoItem>} */
					const chunksInfoMap = new Map();

					/**
					 * @param {CacheGroup} cacheGroup the current cache group
					 * @param {number} cacheGroupIndex the index of the cache group of ordering
					 * @param {Chunk[]} selectedChunks chunks selected for this module
					 * @param {bigint} selectedChunksKey a key of selectedChunks
					 * @param {Module} module the current module
					 * @returns {void}
					 */
					const addModuleToChunksInfoMap = (
						cacheGroup,
						cacheGroupIndex,
						selectedChunks,
						selectedChunksKey,
						module
					) => {
						// Break if minimum number of chunks is not reached
						if (selectedChunks.length < cacheGroup.minChunks) return;
						// Determine name for split chunk
						const name = cacheGroup.getName(
							module,
							selectedChunks,
							cacheGroup.key
						);
						// Check if the name is ok
						if (!alreadyValidatedNames.has(name)) {
							alreadyValidatedNames.add(name);
							if (compilation.namedChunks.has(name)) {
								compilation.errors.push(
									new WebpackError(
										"SplitChunksPlugin\n" +
											`Cache group "${cacheGroup.key}" conflicts with existing chunk.\n` +
											`Both have the same name "${name}".\n` +
											"Use a different name for the cache group.\n" +
											'HINT: You can omit "name" to automatically create a name.\n' +
											"BREAKING CHANGE: webpack < 5 used to allow to use the " +
											"entrypoint as splitChunk. This is no longer allowed. " +
											"Remove this entrypoint and add modules to cache group's 'test' instead. " +
											"If you need modules to be evaluated on startup, add them to the existing entrypoints (make them arrays). " +
											"See migration guide of more info."
									)
								);
							}
						}
						// Create key for maps
						// When it has a name we use the name as key
						// Otherwise we create the key from chunks and cache group key
						// This automatically merges equal names
						const key =
							cacheGroup.key +
							(name ? ` name:${name}` : ` chunks:${selectedChunksKey}`);
						// Add module to maps
						let info = chunksInfoMap.get(key);
						if (info === undefined) {
							chunksInfoMap.set(
								key,
								(info = {
									modules: new SortableSet(
										undefined,
										compareModulesByIdentifier
									),
									cacheGroup,
									cacheGroupIndex,
									name,
									sizes: {},
									chunks: new Set(),
									reuseableChunks: new Set(),
									chunksKeys: new Set()
								})
							);
						}
						info.modules.add(module);
						for (const type of module.getSourceTypes()) {
							info.sizes[type] = (info.sizes[type] || 0) + module.size(type);
						}
						if (!info.chunksKeys.has(selectedChunksKey)) {
							info.chunksKeys.add(selectedChunksKey);
							for (const chunk of selectedChunks) {
								info.chunks.add(chunk);
							}
						}
					};

					const context = {
						moduleGraph,
						chunkGraph
					};

					logger.timeEnd("prepare");

					logger.time("modules");

					// Walk through all modules
					for (const module of compilation.modules) {
						// Get cache group
						let cacheGroups = this.options.getCacheGroups(module, context);
						if (!Array.isArray(cacheGroups) || cacheGroups.length === 0) {
							continue;
						}

						// Prepare some values (usedExports = false)
						const getCombs = memorize(() => {
							const chunks = chunkGraph.getModuleChunksIterable(module);
							const chunksKey = getKey(chunks);
							return getCombinations(chunksKey);
						});

						// Prepare some values (usedExports = true)
						const getCombsByUsedExports = memorize(() => {
							// fill the groupedByExportsMap
							getExportsChunkSetsInGraph();
							/** @type {Set<Set<Chunk>>} */
							const set = new Set();
							const groupedByUsedExports = groupedByExportsMap.get(module);
							for (const chunks of groupedByUsedExports) {
								const chunksKey = getKey(chunks);
								for (const comb of getExportsCombinations(chunksKey))
									set.add(comb);
							}
							return set;
						});

						let cacheGroupIndex = 0;
						for (const cacheGroupSource of cacheGroups) {
							const cacheGroup = this._getCacheGroup(cacheGroupSource);

							const combs = cacheGroup.usedExports
								? getCombsByUsedExports()
								: getCombs();
							// For all combination of chunk selection
							for (const chunkCombination of combs) {
								// Break if minimum number of chunks is not reached
								if (chunkCombination.size < cacheGroup.minChunks) continue;
								// Select chunks by configuration
								const {
									chunks: selectedChunks,
									key: selectedChunksKey
								} = getSelectedChunks(
									chunkCombination,
									cacheGroup.chunksFilter
								);

								addModuleToChunksInfoMap(
									cacheGroup,
									cacheGroupIndex,
									selectedChunks,
									selectedChunksKey,
									module
								);
							}
							cacheGroupIndex++;
						}
					}

					logger.timeEnd("modules");

					logger.time("queue");

					// Filter items were size < minSize
					for (const [key, info] of chunksInfoMap) {
						if (
							info.cacheGroup._validateSize &&
							!checkMinSize(info.sizes, info.cacheGroup.minSize)
						) {
							chunksInfoMap.delete(key);
						}
					}

					/**
					 * @typedef {Object} MaxSizeQueueItem
					 * @property {SplitChunksSizes} minSize
					 * @property {SplitChunksSizes} maxAsyncSize
					 * @property {SplitChunksSizes} maxInitialSize
					 * @property {string} automaticNameDelimiter
					 * @property {string[]} keys
					 */

					/** @type {Map<Chunk, MaxSizeQueueItem>} */
					const maxSizeQueueMap = new Map();

					while (chunksInfoMap.size > 0) {
						// Find best matching entry
						let bestEntryKey;
						let bestEntry;
						for (const pair of chunksInfoMap) {
							const key = pair[0];
							const info = pair[1];
							if (
								bestEntry === undefined ||
								compareEntries(bestEntry, info) < 0
							) {
								bestEntry = info;
								bestEntryKey = key;
							}
						}

						const item = bestEntry;
						chunksInfoMap.delete(bestEntryKey);

						let chunkName = item.name;
						// Variable for the new chunk (lazy created)
						/** @type {Chunk} */
						let newChunk;
						// When no chunk name, check if we can reuse a chunk instead of creating a new one
						let isExistingChunk = false;
						let isReusedWithAllModules = false;
						if (chunkName) {
							const chunkByName = compilation.namedChunks.get(chunkName);
							if (chunkByName !== undefined) {
								newChunk = chunkByName;
								item.chunks.delete(newChunk);
								isExistingChunk = true;
							}
						} else if (item.cacheGroup.reuseExistingChunk) {
							outer: for (const chunk of item.chunks) {
								if (
									chunkGraph.getNumberOfChunkModules(chunk) !==
									item.modules.size
								) {
									continue;
								}
								if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
									continue;
								}
								for (const module of item.modules) {
									if (!chunkGraph.isModuleInChunk(module, chunk)) {
										continue outer;
									}
								}
								if (!newChunk || !newChunk.name) {
									newChunk = chunk;
								} else if (
									chunk.name &&
									chunk.name.length < newChunk.name.length
								) {
									newChunk = chunk;
								} else if (
									chunk.name &&
									chunk.name.length === newChunk.name.length &&
									chunk.name < newChunk.name
								) {
									newChunk = chunk;
								}
							}
							if (newChunk) {
								item.chunks.delete(newChunk);
								chunkName = undefined;
								isExistingChunk = true;
								isReusedWithAllModules = true;
							}
						}

						// Skip when no chunk selected
						// TODO check if this check is really needed, shouldn't chunks always be non-empty?
						if (item.chunks.size === 0 && !isExistingChunk) continue;

						const enforced =
							item.cacheGroup._conditionalEnforce &&
							checkMinSize(item.sizes, item.cacheGroup.enforceSizeThreshold);

						const usedChunks = new Set(item.chunks);

						// Check if maxRequests condition can be fulfilled
						if (
							!enforced &&
							(Number.isFinite(item.cacheGroup.maxInitialRequests) ||
								Number.isFinite(item.cacheGroup.maxAsyncRequests))
						) {
							for (const chunk of usedChunks) {
								// respect max requests
								const maxRequests = chunk.isOnlyInitial()
									? item.cacheGroup.maxInitialRequests
									: chunk.canBeInitial()
									? Math.min(
											item.cacheGroup.maxInitialRequests,
											item.cacheGroup.maxAsyncRequests
									  )
									: item.cacheGroup.maxAsyncRequests;
								if (
									isFinite(maxRequests) &&
									getRequests(chunk) >= maxRequests
								) {
									usedChunks.delete(chunk);
								}
							}
						}

						outer: for (const chunk of usedChunks) {
							for (const module of item.modules) {
								if (chunkGraph.isModuleInChunk(module, chunk)) continue outer;
							}
							usedChunks.delete(chunk);
						}

						// Were some (invalid) chunks removed from usedChunks?
						// => readd all modules to the queue, as things could have been changed
						if (usedChunks.size < item.chunks.size) {
							if (isExistingChunk) usedChunks.add(newChunk);
							if (usedChunks.size >= item.cacheGroup.minChunks) {
								const chunksArr = Array.from(usedChunks);
								for (const module of item.modules) {
									addModuleToChunksInfoMap(
										item.cacheGroup,
										item.cacheGroupIndex,
										chunksArr,
										getKey(usedChunks),
										module
									);
								}
							}
							continue;
						}

						// Validate minRemainingSize constraint when a single chunk is left over
						if (
							!enforced &&
							item.cacheGroup._validateRemainingSize &&
							usedChunks.size === 1
						) {
							const [chunk] = usedChunks;
							let chunkSizes = Object.create(null);
							for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
								if (!item.modules.has(module)) {
									for (const type of module.getSourceTypes()) {
										chunkSizes[type] =
											(chunkSizes[type] || 0) + module.size(type);
									}
								}
							}
							if (!checkMinSize(chunkSizes, item.cacheGroup.minRemainingSize)) {
								continue;
							}
						}

						// Create the new chunk if not reusing one
						if (!isExistingChunk) {
							newChunk = compilation.addChunk(chunkName);
						}
						// Walk through all chunks
						for (const chunk of usedChunks) {
							// Add graph connections for splitted chunk
							chunk.split(newChunk);
						}

						// Add a note to the chunk
						newChunk.chunkReason =
							(newChunk.chunkReason ? newChunk.chunkReason + ", " : "") +
							(isReusedWithAllModules
								? "reused as split chunk"
								: "split chunk");
						if (item.cacheGroup.key) {
							newChunk.chunkReason += ` (cache group: ${item.cacheGroup.key})`;
						}
						if (chunkName) {
							newChunk.chunkReason += ` (name: ${chunkName})`;
							// If the chosen name is already an entry point we remove the entry point
							const entrypoint = compilation.entrypoints.get(chunkName);
							if (entrypoint) {
								compilation.entrypoints.delete(chunkName);
								entrypoint.remove();
								chunkGraph.disconnectEntries(newChunk);
							}
						}
						if (item.cacheGroup.filename) {
							newChunk.filenameTemplate = item.cacheGroup.filename;
						}
						if (item.cacheGroup.idHint) {
							newChunk.idNameHints.add(item.cacheGroup.idHint);
						}
						if (!isReusedWithAllModules) {
							// Add all modules to the new chunk
							for (const module of item.modules) {
								if (!module.chunkCondition(newChunk, compilation)) continue;
								// Add module to new chunk
								chunkGraph.connectChunkAndModule(newChunk, module);
								// Remove module from used chunks
								for (const chunk of usedChunks) {
									chunkGraph.disconnectChunkAndModule(chunk, module);
								}
							}
						} else {
							// Remove all modules from used chunks
							for (const module of item.modules) {
								for (const chunk of usedChunks) {
									chunkGraph.disconnectChunkAndModule(chunk, module);
								}
							}
						}

						if (
							Object.keys(item.cacheGroup.maxAsyncSize).length > 0 ||
							Object.keys(item.cacheGroup.maxInitialSize).length > 0
						) {
							const oldMaxSizeSettings = maxSizeQueueMap.get(newChunk);
							maxSizeQueueMap.set(newChunk, {
								minSize: oldMaxSizeSettings
									? combineSizes(
											oldMaxSizeSettings.minSize,
											item.cacheGroup._minSizeForMaxSize,
											Math.max
									  )
									: item.cacheGroup.minSize,
								maxAsyncSize: oldMaxSizeSettings
									? combineSizes(
											oldMaxSizeSettings.maxAsyncSize,
											item.cacheGroup.maxAsyncSize,
											Math.min
									  )
									: item.cacheGroup.maxAsyncSize,
								maxInitialSize: oldMaxSizeSettings
									? combineSizes(
											oldMaxSizeSettings.maxInitialSize,
											item.cacheGroup.maxInitialSize,
											Math.min
									  )
									: item.cacheGroup.maxInitialSize,
								automaticNameDelimiter: item.cacheGroup.automaticNameDelimiter,
								keys: oldMaxSizeSettings
									? oldMaxSizeSettings.keys.concat(item.cacheGroup.key)
									: [item.cacheGroup.key]
							});
						}

						// remove all modules from other entries and update size
						for (const [key, info] of chunksInfoMap) {
							if (isOverlap(info.chunks, usedChunks)) {
								// update modules and total size
								// may remove it from the map when < minSize
								let updated = false;
								for (const module of item.modules) {
									if (info.modules.has(module)) {
										// remove module
										info.modules.delete(module);
										// update size
										for (const key of module.getSourceTypes()) {
											info.sizes[key] -= module.size(key);
										}
										updated = true;
									}
								}
								if (updated) {
									if (info.modules.size === 0) {
										chunksInfoMap.delete(key);
										continue;
									}
									if (
										info.cacheGroup._validateSize &&
										!checkMinSize(info.sizes, info.cacheGroup.minSize)
									) {
										chunksInfoMap.delete(key);
									}
								}
							}
						}
					}

					logger.timeEnd("queue");

					logger.time("maxSize");

					/** @type {Set<string>} */
					const incorrectMinMaxSizeSet = new Set();

					const { outputOptions } = compilation;

					// Make sure that maxSize is fulfilled
					for (const chunk of Array.from(compilation.chunks)) {
						const chunkConfig = maxSizeQueueMap.get(chunk);
						const {
							minSize,
							maxAsyncSize,
							maxInitialSize,
							automaticNameDelimiter
						} = chunkConfig || this.options.fallbackCacheGroup;
						/** @type {SplitChunksSizes} */
						let maxSize;
						if (chunk.isOnlyInitial()) {
							maxSize = maxInitialSize;
						} else if (chunk.canBeInitial()) {
							maxSize = combineSizes(maxAsyncSize, maxInitialSize, Math.min);
						} else {
							maxSize = maxAsyncSize;
						}
						if (Object.keys(maxSize).length === 0) {
							continue;
						}
						for (const key of Object.keys(maxSize)) {
							const maxSizeValue = maxSize[key];
							const minSizeValue = minSize[key];
							if (
								typeof minSizeValue === "number" &&
								minSizeValue > maxSizeValue
							) {
								const keys = chunkConfig && chunkConfig.keys;
								const warningKey = `${
									keys && keys.join()
								} ${minSizeValue} ${maxSizeValue}`;
								if (!incorrectMinMaxSizeSet.has(warningKey)) {
									incorrectMinMaxSizeSet.add(warningKey);
									compilation.warnings.push(
										new MinMaxSizeWarning(keys, minSizeValue, maxSizeValue)
									);
								}
							}
						}
						const results = deterministicGroupingForModules({
							minSize,
							maxSize: mapObject(maxSize, (value, key) => {
								const minSizeValue = minSize[key];
								return typeof minSizeValue === "number"
									? Math.max(value, minSizeValue)
									: value;
							}),
							items: chunkGraph.getChunkModulesIterable(chunk),
							getKey(module) {
								const cache = getKeyCache.get(module);
								if (cache !== undefined) return cache;
								const ident = cachedContextify(module.identifier());
								const nameForCondition =
									module.nameForCondition && module.nameForCondition();
								const name = nameForCondition
									? cachedContextify(nameForCondition)
									: ident.replace(/^.*!|\?[^?!]*$/g, "");
								const fullKey =
									name +
									automaticNameDelimiter +
									hashFilename(ident, outputOptions);
								const key = requestToId(fullKey);
								getKeyCache.set(module, key);
								return key;
							},
							getSize(module) {
								const size = Object.create(null);
								for (const key of module.getSourceTypes()) {
									size[key] = module.size(key);
								}
								return size;
							}
						});
						if (results.length <= 1) {
							continue;
						}
						for (let i = 0; i < results.length; i++) {
							const group = results[i];
							const key = this.options.hidePathInfo
								? hashFilename(group.key, outputOptions)
								: group.key;
							let name = chunk.name
								? chunk.name + automaticNameDelimiter + key
								: null;
							if (name && name.length > 100) {
								name =
									name.slice(0, 100) +
									automaticNameDelimiter +
									hashFilename(name, outputOptions);
							}
							if (i !== results.length - 1) {
								const newPart = compilation.addChunk(name);
								chunk.split(newPart);
								newPart.chunkReason = chunk.chunkReason;
								// Add all modules to the new chunk
								for (const module of group.items) {
									if (!module.chunkCondition(newPart, compilation)) {
										continue;
									}
									// Add module to new chunk
									chunkGraph.connectChunkAndModule(newPart, module);
									// Remove module from used chunks
									chunkGraph.disconnectChunkAndModule(chunk, module);
								}
							} else {
								// change the chunk to be a part
								chunk.name = name;
							}
						}
					}
					logger.timeEnd("maxSize");
				}
			);
		});
	}
};
