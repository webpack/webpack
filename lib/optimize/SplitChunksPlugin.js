/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../errors/WebpackError");
const Chunk = require("../graph/Chunk");
const { requestToId } = require("../ids/IdHelpers");
const { isSubset } = require("../util/SetHelpers");
const SortableSet = require("../util/SortableSet");
const { discoverIntersections } = require("../util/chunkSetIntersections");
const {
	compareIterables,
	compareModulesByIdentifier
} = require("../util/comparators");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const memoize = require("../util/memoize");
const MinMaxSizeWarning = require("./MinMaxSizeWarning");
const { STAGE_ADVANCED } = require("./OptimizationStages");
const deterministicGrouping = require("./deterministicGrouping");

/**
 * @import {
 * 	OptimizationSplitChunksCacheGroup,
 * 	OptimizationSplitChunksOptions,
 * 	OptimizationSplitChunksSizes
 * } from "../../declarations/WebpackOptions"
 */
/**
 * @import {
 * 	OutputNormalizedWithDefaults as OutputOptions
 * } from "../config/defaults"
 */
/** @import { ChunkName, ChunkFilenameTemplate } from "../graph/Chunk" */
/** @import ChunkGraph from "../graph/ChunkGraph" */
/** @import ChunkGroup from "../graph/ChunkGroup" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Module, { SourceType } from "../module/Module" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @typedef {import("./deterministicGrouping").GroupedItems<Module>} DeterministicGroupingGroupedItemsForModule */
/** @typedef {import("./deterministicGrouping").Options<Module>} DeterministicGroupingOptionsForModule */
/** @import { Sizes } from "./deterministicGrouping" */

/**
 * Defines the chunk filter fn callback.
 * @callback ChunkFilterFn
 * @param {Chunk} chunk
 * @returns {boolean | undefined}
 */

/** @typedef {number} Priority */
/** @typedef {number} Size */
/** @typedef {number} CountOfChunk */
/** @typedef {number} CountOfRequest */

/**
 * Defines the combine size function callback.
 * @callback CombineSizeFunction
 * @param {Size} a
 * @param {Size} b
 * @returns {Size}
 */

/** @typedef {SourceType[]} SourceTypes */
/** @typedef {SourceType[]} DefaultSizeTypes */
/** @typedef {Record<SourceType, Size>} SplitChunksSizes */

/**
 * Defines the cache group source type used by this module.
 * @typedef {object} CacheGroupSource
 * @property {string} key
 * @property {Priority=} priority
 * @property {GetNameFn=} getName
 * @property {ChunkFilterFn=} chunksFilter
 * @property {boolean=} enforce
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minSizeReduction
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {CountOfChunk=} minChunks
 * @property {CountOfRequest=} maxAsyncRequests
 * @property {CountOfRequest=} maxInitialRequests
 * @property {ChunkFilenameTemplate=} filename
 * @property {string=} idHint
 * @property {string=} automaticNameDelimiter
 * @property {boolean=} reuseExistingChunk
 * @property {boolean=} usedExports
 */

/**
 * Defines the cache group type used by this module.
 * @typedef {object} CacheGroup
 * @property {string} key
 * @property {Priority} priority
 * @property {GetNameFn=} getName
 * @property {ChunkFilterFn} chunksFilter
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minSizeReduction
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {CountOfChunk} minChunks
 * @property {CountOfRequest} maxAsyncRequests
 * @property {CountOfRequest} maxInitialRequests
 * @property {ChunkFilenameTemplate=} filename
 * @property {string} idHint
 * @property {string} automaticNameDelimiter
 * @property {boolean} reuseExistingChunk
 * @property {boolean} usedExports
 * @property {boolean} _validateSize
 * @property {boolean} _validateSizeReduction
 * @property {boolean} _validateRemainingSize
 * @property {SplitChunksSizes} _minSizeForMaxSize
 * @property {boolean} _conditionalEnforce
 */

/**
 * Defines the fallback cache group type used by this module.
 * @typedef {object} FallbackCacheGroup
 * @property {ChunkFilterFn} chunksFilter
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {SplitChunksSizes} maxInitialSize
 * @property {string} automaticNameDelimiter
 */

/**
 * Defines the cache groups context type used by this module.
 * @typedef {object} CacheGroupsContext
 * @property {ModuleGraph} moduleGraph
 * @property {ChunkGraph} chunkGraph
 */

/** @typedef {(module: Module) => OptimizationSplitChunksCacheGroup | OptimizationSplitChunksCacheGroup[] | void} RawGetCacheGroups */

/**
 * Defines the get cache groups callback.
 * @callback GetCacheGroups
 * @param {Module} module
 * @param {CacheGroupsContext} context
 * @returns {CacheGroupSource[] | null}
 */

/**
 * Defines the get name fn callback.
 * @callback GetNameFn
 * @param {Module} module
 * @param {Chunk[]} chunks
 * @param {string} key
 * @returns {string | undefined}
 */

/**
 * Defines the split chunks options type used by this module.
 * @typedef {object} SplitChunksOptions
 * @property {number | undefined} dedupDepth
 * @property {ChunkFilterFn} chunksFilter
 * @property {DefaultSizeTypes} defaultSizeTypes
 * @property {SplitChunksSizes} minSize
 * @property {SplitChunksSizes} minSizeReduction
 * @property {SplitChunksSizes} minRemainingSize
 * @property {SplitChunksSizes} enforceSizeThreshold
 * @property {SplitChunksSizes} maxInitialSize
 * @property {SplitChunksSizes} maxAsyncSize
 * @property {CountOfChunk} minChunks
 * @property {CountOfRequest} maxAsyncRequests
 * @property {CountOfRequest} maxInitialRequests
 * @property {boolean} hidePathInfo
 * @property {ChunkFilenameTemplate=} filename
 * @property {string} automaticNameDelimiter
 * @property {GetCacheGroups} getCacheGroups
 * @property {GetNameFn} getName
 * @property {boolean} usedExports
 * @property {FallbackCacheGroup} fallbackCacheGroup
 */

/**
 * A cache group as intersection discovery reads it: what it takes, and how much
 * the modules it would take have to weigh.
 * @typedef {object} IntersectionCacheGroup
 * @property {OptimizationSplitChunksCacheGroup["test"]} test the modules it accepts
 * @property {SplitChunksSizes} minSize the size each of their types must reach
 */

/**
 * What the cache groups taking intersections allow discovery to assume.
 * @typedef {object} IntersectionSettings
 * @property {number} minSize size an intersection's modules must reach, `0` when unbounded
 * @property {number} minMembers fewest chunks an intersection is worth discovering with
 * @property {IntersectionCacheGroup[] | undefined} groups the cache groups taking them, when every one of them is known
 */

/** @typedef {Set<Chunk>} ChunkSet  */

/**
 * Defines the chunks info item type used by this module.
 * @typedef {object} ChunksInfoItem
 * @property {SortableSet<Module>} modules
 * @property {CacheGroup} cacheGroup
 * @property {number} cacheGroupIndex
 * @property {string=} name
 * @property {SplitChunksSizes} sizes
 * @property {ChunkSet} chunks
 * @property {Set<bigint | Chunk>} chunksKeys
 */

/** @type {GetNameFn} */
const defaultGetName = () => undefined;

const deterministicGroupingForModules =
	/** @type {(options: DeterministicGroupingOptionsForModule) => DeterministicGroupingGroupedItemsForModule[]} */
	(deterministicGrouping);

/** @type {WeakMap<Module, string>} */
const getKeyCache = new WeakMap();

/**
 * Returns hashed filename.
 * @param {string} name a filename to hash
 * @param {OutputOptions} outputOptions hash function used
 * @returns {string} hashed filename
 */
const hashFilename = (name, outputOptions) => {
	const digest =
		/** @type {string} */
		(
			createHash(outputOptions.hashFunction)
				.update(name)
				.digest(outputOptions.hashDigest)
		);
	return digest.slice(0, 8);
};

/**
 * A split `maxInitialRequests`/`maxAsyncRequests` refused, recorded for
 * `performance.splitChunksCapped`.
 * @typedef {object} CappedSplit
 * @property {string} cacheGroup the cache group whose split was refused
 * @property {Chunk} chunk the chunk it would have been taken out of
 * @property {"maxAsyncRequests" | "maxInitialRequests"} limit the option that refused it
 * @property {number} maxRequests the value that option had
 * @property {number} modules how many modules the split would have moved
 */

/** @type {WeakMap<Compilation, CappedSplit[]>} */
const CAPPED_SPLITS = new WeakMap();

/**
 * Reads back the splits a request cap refused during this compilation.
 * @param {Compilation} compilation the compilation
 * @returns {CappedSplit[] | undefined} the refused splits, or `undefined` when nothing recorded them
 */
const getCappedSplits = (compilation) => CAPPED_SPLITS.get(compilation);

/**
 * Returns the number of requests.
 * @param {Chunk} chunk the chunk
 * @returns {CountOfRequest} the number of requests
 */
const getRequests = (chunk) => {
	let requests = 0;
	for (const chunkGroup of chunk.groupsIterable) {
		requests = Math.max(requests, chunkGroup.chunks.length);
	}
	return requests;
};

/**
 * Returns result.
 * @template {object} T
 * @param {T} obj obj an object
 * @param {(obj: T[keyof T], key: keyof T) => T[keyof T]} fn fn
 * @returns {T} result
 */
const mapObject = (obj, fn) => {
	/** @type {T} */
	const newObj = Object.create(null);
	for (const key of Object.keys(obj)) {
		newObj[/** @type {keyof T} */ (key)] = fn(
			obj[/** @type {keyof T} */ (key)],
			/** @type {keyof T} */
			(key)
		);
	}
	return newObj;
};

/**
 * Checks whether this object is overlap.
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
 * Compares the provided values and returns their ordering.
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
	const indexDiff = b.cacheGroupIndex - a.cacheGroupIndex;
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

/**
 * Initial chunk filter.
 * @param {Chunk} chunk the chunk
 * @returns {boolean} true, if the chunk is an entry chunk
 */
const INITIAL_CHUNK_FILTER = (chunk) => chunk.canBeInitial();
/**
 * Async chunk filter.
 * @param {Chunk} chunk the chunk
 * @returns {boolean} true, if the chunk is an async chunk
 */
const ASYNC_CHUNK_FILTER = (chunk) => !chunk.canBeInitial();
/**
 * Returns always true.
 * @param {Chunk} _chunk the chunk
 * @returns {boolean} always true
 */
const ALL_CHUNK_FILTER = (_chunk) => true;

/** Placeholder until a chunk set group is filled and its signatures are written. */
const EMPTY_SIGNATURES = new Uint32Array(0);

// What one compilation may spend looking for the intersections of its chunk
// sets: a word of every pair of them it reaches, and the intersections it keeps,
// bounding the worst case of chunk sets that each span most chunks.

// TODO raise or drop both once threads carry the search, as rspack needs no
// ceiling with rayon behind it
const MAX_INTERSECTION_WORK = 50000000;
const MAX_INTERSECTIONS = 10000;

/**
 * Returns normalized representation.
 * @param {OptimizationSplitChunksSizes | undefined} value the sizes
 * @param {DefaultSizeTypes} defaultSizeTypes the default size types
 * @returns {SplitChunksSizes} normalized representation
 */
const normalizeSizes = (value, defaultSizeTypes) => {
	if (typeof value === "number") {
		/** @type {SplitChunksSizes} */
		const o = {};
		for (const sizeType of defaultSizeTypes) o[sizeType] = value;
		return o;
	} else if (typeof value === "object" && value !== null) {
		return { ...value };
	}
	return {};
};

/**
 * Merges the provided values into a single result.
 * @param {...(SplitChunksSizes | undefined)} sizes the sizes
 * @returns {SplitChunksSizes} the merged sizes
 */
const mergeSizes = (...sizes) => {
	/** @type {SplitChunksSizes} */
	let merged = {};
	for (let i = sizes.length - 1; i >= 0; i--) {
		merged = Object.assign(merged, sizes[i]);
	}
	return merged;
};

/**
 * Checks whether this object contains the size.
 * @param {SplitChunksSizes} sizes the sizes
 * @returns {boolean} true, if there are sizes > 0
 */
const hasNonZeroSizes = (sizes) => {
	for (const key of /** @type {SourceType[]} */ (Object.keys(sizes))) {
		if (sizes[key] > 0) return true;
	}
	return false;
};

/**
 * Returns the combine sizes.
 * @param {SplitChunksSizes} a first sizes
 * @param {SplitChunksSizes} b second sizes
 * @param {CombineSizeFunction} combine a function to combine sizes
 * @returns {SplitChunksSizes} the combine sizes
 */
const combineSizes = (a, b, combine) => {
	const aKeys = /** @type {Set<SourceType>} */ (new Set(Object.keys(a)));
	const bKeys = /** @type {Set<SourceType>} */ (new Set(Object.keys(b)));
	/** @type {SplitChunksSizes} */
	const result = {};
	for (const key of aKeys) {
		result[key] = bKeys.has(key) ? combine(a[key], b[key]) : a[key];
	}
	for (const key of bKeys) {
		if (!aKeys.has(key)) {
			result[key] = b[key];
		}
	}
	return result;
};

/**
 * Checks true if there are sizes and all existing sizes are at least minSize.
 * @param {SplitChunksSizes} sizes the sizes
 * @param {SplitChunksSizes} minSize the min sizes
 * @returns {boolean} true if there are sizes and all existing sizes are at least `minSize`
 */
const checkMinSize = (sizes, minSize) => {
	for (const key of /** @type {SourceType[]} */ (Object.keys(minSize))) {
		const size = sizes[key];
		if (size === undefined || size === 0) continue;
		if (size < minSize[key]) return false;
	}
	return true;
};

/**
 * Checks min size reduction.
 * @param {SplitChunksSizes} sizes the sizes
 * @param {SplitChunksSizes} minSizeReduction the min sizes
 * @param {CountOfChunk} chunkCount number of chunks
 * @returns {boolean} true if there are sizes and all existing sizes are at least `minSizeReduction`
 */
const checkMinSizeReduction = (sizes, minSizeReduction, chunkCount) => {
	for (const key of /** @type {SourceType[]} */ (
		Object.keys(minSizeReduction)
	)) {
		const size = sizes[key];
		if (size === undefined || size === 0) continue;
		if (size * chunkCount < minSizeReduction[key]) return false;
	}
	return true;
};

/**
 * Gets violating min sizes.
 * @param {SplitChunksSizes} sizes the sizes
 * @param {SplitChunksSizes} minSize the min sizes
 * @returns {undefined | SourceTypes} list of size types that are below min size
 */
const getViolatingMinSizes = (sizes, minSize) => {
	/** @type {SourceTypes | undefined} */
	let list;
	for (const key of /** @type {SourceType[]} */ (Object.keys(minSize))) {
		const size = sizes[key];
		if (size === undefined || size === 0) continue;
		if (size < minSize[key]) {
			if (list === undefined) list = [key];
			else list.push(key);
		}
	}
	return list;
};

/**
 * Returns the total size.
 * @param {SplitChunksSizes} sizes the sizes
 * @returns {Size} the total size
 */
const totalSize = (sizes) => {
	let size = 0;
	for (const key of /** @type {SourceType[]} */ (Object.keys(sizes))) {
		size += sizes[key];
	}
	return size;
};

/**
 * Returns a function to get the name of the chunk.
 * @param {OptimizationSplitChunksCacheGroup["name"]} name the chunk name
 * @returns {GetNameFn | undefined} a function to get the name of the chunk
 */
const normalizeName = (name) => {
	if (typeof name === "string") {
		return () => name;
	}
	if (typeof name === "function") {
		return /** @type {GetNameFn} */ (name);
	}
};

/**
 * Normalizes chunks filter.
 * @param {OptimizationSplitChunksCacheGroup["chunks"]} chunks the chunk filter option
 * @returns {ChunkFilterFn | undefined} the chunk filter function
 */
const normalizeChunksFilter = (chunks) => {
	if (chunks === "initial") {
		return INITIAL_CHUNK_FILTER;
	}
	if (chunks === "async") {
		return ASYNC_CHUNK_FILTER;
	}
	if (chunks === "all") {
		return ALL_CHUNK_FILTER;
	}
	if (chunks instanceof RegExp) {
		return (chunk) => (chunk.name ? chunks.test(chunk.name) : false);
	}
	if (typeof chunks === "function") {
		return chunks;
	}
};

/**
 * A cache group source a module can only match or not, and what decides it.
 * @typedef {object} StaticCacheGroupSource
 * @property {CacheGroupSource} source the normalized source
 * @property {OptimizationSplitChunksCacheGroup["test"]} test the modules it accepts
 */

/**
 * The normalized cache groups, and what is known about them without a module.
 * @typedef {object} NormalizedCacheGroups
 * @property {GetCacheGroups} getCacheGroups a function to get the cache groups
 * @property {StaticCacheGroupSource[]} staticSources the sources a module can only match or not
 * @property {boolean} hasDynamicSources true when a callback builds sources per module
 */

/**
 * Normalizes cache groups.
 * @param {undefined | GetCacheGroups | Record<string, false | string | RegExp | RawGetCacheGroups | OptimizationSplitChunksCacheGroup>} cacheGroups the cache group options
 * @param {DefaultSizeTypes} defaultSizeTypes the default size types
 * @returns {NormalizedCacheGroups} the normalized cache groups
 */
const normalizeCacheGroups = (cacheGroups, defaultSizeTypes) => {
	if (typeof cacheGroups === "function") {
		return {
			getCacheGroups: cacheGroups,
			staticSources: [],
			hasDynamicSources: true
		};
	}
	if (typeof cacheGroups === "object" && cacheGroups !== null) {
		/** @type {((module: Module, context: CacheGroupsContext, results: CacheGroupSource[]) => void)[]} */
		const handlers = [];
		/** @type {StaticCacheGroupSource[]} */
		const staticSources = [];
		let hasDynamicSources = false;
		for (const key of Object.keys(cacheGroups)) {
			const option = cacheGroups[key];
			if (option === false) {
				continue;
			}
			if (typeof option === "string" || option instanceof RegExp) {
				const source = createCacheGroupSource({}, key, defaultSizeTypes);
				staticSources.push({ source, test: option });
				handlers.push((module, context, results) => {
					if (checkTest(option, module, context)) {
						results.push(source);
					}
				});
			} else if (typeof option === "function") {
				/** @type {WeakMap<OptimizationSplitChunksCacheGroup, CacheGroupSource>} */
				const cache = new WeakMap();
				hasDynamicSources = true;
				handlers.push((module, context, results) => {
					const result = option(module);
					if (result) {
						const groups = Array.isArray(result) ? result : [result];
						for (const group of groups) {
							const cachedSource = cache.get(group);
							if (cachedSource !== undefined) {
								results.push(cachedSource);
							} else {
								const source = createCacheGroupSource(
									group,
									key,
									defaultSizeTypes
								);
								cache.set(group, source);
								results.push(source);
							}
						}
					}
				});
			} else {
				const source = createCacheGroupSource(option, key, defaultSizeTypes);
				staticSources.push({ source, test: option.test });
				handlers.push((module, context, results) => {
					if (
						checkTest(option.test, module, context) &&
						checkModuleType(option.type, module) &&
						checkModuleLayer(option.layer, module)
					) {
						results.push(source);
					}
				});
			}
		}
		/**
		 * Returns the matching cache groups.
		 * @param {Module} module the current module
		 * @param {CacheGroupsContext} context the current context
		 * @returns {CacheGroupSource[]} the matching cache groups
		 */
		const fn = (module, context) => {
			/** @type {CacheGroupSource[]} */
			const results = [];
			for (const fn of handlers) {
				fn(module, context, results);
			}
			return results;
		};
		return { getCacheGroups: fn, staticSources, hasDynamicSources };
	}
	return {
		getCacheGroups: () => null,
		staticSources: [],
		hasDynamicSources: false
	};
};

/** @typedef {(module: Module, context: CacheGroupsContext) => boolean} CheckTestFn */

/**
 * Checks true, if the module should be selected.
 * @param {OptimizationSplitChunksCacheGroup["test"]} test test option
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
		return name ? name.startsWith(test) : false;
	}
	if (test instanceof RegExp) {
		const name = module.nameForCondition();
		return name ? test.test(name) : false;
	}
	return false;
};

/**
 * Whether a module matches a test that decides it without running user code.
 * A callback or a test naming no modules is treated as matching, so a module it
 * might take is never taken for one it cannot.
 * @param {OptimizationSplitChunksCacheGroup["test"]} test test option
 * @param {Module} module the module
 * @returns {boolean} true, if the module may be selected
 */
const matchesStaticTest = (test, module) => {
	if (typeof test === "string") {
		const name = module.nameForCondition();
		return name ? name.startsWith(test) : false;
	}
	if (test instanceof RegExp) {
		const name = module.nameForCondition();
		return name ? test.test(name) : false;
	}
	if (typeof test === "boolean") return test;
	return true;
};

/** @typedef {(type: string) => boolean} CheckModuleTypeFn */

/**
 * Checks module type.
 * @param {OptimizationSplitChunksCacheGroup["type"]} test type option
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

/** @typedef {(layer: string | null) => boolean} CheckModuleLayerFn */

/**
 * Checks module layer.
 * @param {OptimizationSplitChunksCacheGroup["layer"]} test type option
 * @param {Module} module the module
 * @returns {boolean} true, if the module should be selected
 */
const checkModuleLayer = (test, module) => {
	if (test === undefined) return true;
	if (typeof test === "function") {
		return test(module.layer);
	}
	if (typeof test === "string") {
		const layer = module.layer;
		return test === "" ? !layer : layer ? layer.startsWith(test) : false;
	}
	if (test instanceof RegExp) {
		const layer = module.layer;
		return layer ? test.test(layer) : false;
	}
	return false;
};

/**
 * Creates a cache group source.
 * @param {OptimizationSplitChunksCacheGroup} options the group options
 * @param {string} key key of cache group
 * @param {DefaultSizeTypes} defaultSizeTypes the default size types
 * @returns {CacheGroupSource} the normalized cached group
 */
const createCacheGroupSource = (options, key, defaultSizeTypes) => {
	const minSize = normalizeSizes(options.minSize, defaultSizeTypes);
	const minSizeReduction = normalizeSizes(
		options.minSizeReduction,
		defaultSizeTypes
	);
	const maxSize = normalizeSizes(options.maxSize, defaultSizeTypes);
	return {
		key,
		priority: options.priority,
		getName: normalizeName(options.name),
		chunksFilter: normalizeChunksFilter(options.chunks),
		enforce: options.enforce,
		minSize,
		minSizeReduction,
		minRemainingSize: mergeSizes(
			normalizeSizes(options.minRemainingSize, defaultSizeTypes),
			minSize
		),
		enforceSizeThreshold: normalizeSizes(
			options.enforceSizeThreshold,
			defaultSizeTypes
		),
		maxAsyncSize: mergeSizes(
			normalizeSizes(options.maxAsyncSize, defaultSizeTypes),
			maxSize
		),
		maxInitialSize: mergeSizes(
			normalizeSizes(options.maxInitialSize, defaultSizeTypes),
			maxSize
		),
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

const PLUGIN_NAME = "SplitChunksPlugin";

class SplitChunksPlugin {
	/**
	 * Creates an instance of SplitChunksPlugin.
	 * @param {OptimizationSplitChunksOptions=} options plugin options
	 */
	constructor(options = {}) {
		if (
			options.dedupDepth !== undefined &&
			(!Number.isInteger(options.dedupDepth) ||
				options.dedupDepth < 0 ||
				options.dedupDepth > 0xffffffff)
		) {
			throw new WebpackError(
				'"optimization.splitChunks.dedupDepth" must be an integer between 0 and 4294967295.'
			);
		}
		const defaultSizeTypes = options.defaultSizeTypes || [
			"javascript",
			"unknown"
		];
		const fallbackCacheGroup = options.fallbackCacheGroup || {};
		const minSize = normalizeSizes(options.minSize, defaultSizeTypes);
		const minSizeReduction = normalizeSizes(
			options.minSizeReduction,
			defaultSizeTypes
		);
		const maxSize = normalizeSizes(options.maxSize, defaultSizeTypes);
		const { getCacheGroups, staticSources, hasDynamicSources } =
			normalizeCacheGroups(options.cacheGroups, defaultSizeTypes);

		/** @type {SplitChunksOptions} */
		this.options = {
			dedupDepth: options.dedupDepth,
			chunksFilter:
				/** @type {ChunkFilterFn} */
				(normalizeChunksFilter(options.chunks || "all")),
			defaultSizeTypes,
			minSize,
			minSizeReduction,
			minRemainingSize: mergeSizes(
				normalizeSizes(options.minRemainingSize, defaultSizeTypes),
				minSize
			),
			enforceSizeThreshold: normalizeSizes(
				options.enforceSizeThreshold,
				defaultSizeTypes
			),
			maxAsyncSize: mergeSizes(
				normalizeSizes(options.maxAsyncSize, defaultSizeTypes),
				maxSize
			),
			maxInitialSize: mergeSizes(
				normalizeSizes(options.maxInitialSize, defaultSizeTypes),
				maxSize
			),
			minChunks: options.minChunks || 1,
			maxAsyncRequests: options.maxAsyncRequests || 1,
			maxInitialRequests: options.maxInitialRequests || 1,
			hidePathInfo: options.hidePathInfo || false,
			filename: options.filename || undefined,
			getCacheGroups,
			getName: options.name
				? /** @type {GetNameFn} */ (normalizeName(options.name))
				: defaultGetName,
			automaticNameDelimiter: options.automaticNameDelimiter || "-",
			usedExports: options.usedExports || false,
			fallbackCacheGroup: {
				chunksFilter:
					/** @type {ChunkFilterFn} */
					(
						normalizeChunksFilter(
							fallbackCacheGroup.chunks || options.chunks || "all"
						)
					),
				minSize: mergeSizes(
					normalizeSizes(fallbackCacheGroup.minSize, defaultSizeTypes),
					minSize
				),
				maxAsyncSize: mergeSizes(
					normalizeSizes(fallbackCacheGroup.maxAsyncSize, defaultSizeTypes),
					normalizeSizes(fallbackCacheGroup.maxSize, defaultSizeTypes),
					normalizeSizes(options.maxAsyncSize, defaultSizeTypes),
					normalizeSizes(options.maxSize, defaultSizeTypes)
				),
				maxInitialSize: mergeSizes(
					normalizeSizes(fallbackCacheGroup.maxInitialSize, defaultSizeTypes),
					normalizeSizes(fallbackCacheGroup.maxSize, defaultSizeTypes),
					normalizeSizes(options.maxInitialSize, defaultSizeTypes),
					normalizeSizes(options.maxSize, defaultSizeTypes)
				),
				automaticNameDelimiter:
					fallbackCacheGroup.automaticNameDelimiter ||
					options.automaticNameDelimiter ||
					"~"
			}
		};

		/** @type {WeakMap<CacheGroupSource, CacheGroup>} */
		this._cacheGroupCache = new WeakMap();
		/** @type {StaticCacheGroupSource[]} */
		this._staticCacheGroupSources = staticSources;
		this._hasDynamicCacheGroups = hasDynamicSources;
	}

	/**
	 * Settings for the intersections a chunk set discovers, or `undefined` when no
	 * cache group would take one.
	 * @param {boolean} usedExports true for the sets grouped by used exports
	 * @param {number} dedupDepth rounds of discovery this compilation allows
	 * @returns {IntersectionSettings | undefined} the settings, when discovery applies
	 */
	_getIntersectionSettings(usedExports, dedupDepth) {
		if (dedupDepth === 0) return undefined;
		// A callback builds its cache groups per module, so neither what they take
		// nor what they ask of it is known here: discover for the widest of them,
		// and bound nothing.
		if (this._hasDynamicCacheGroups) {
			return { minSize: 0, minMembers: 1, groups: undefined };
		}
		/** @type {IntersectionCacheGroup[]} */
		const groups = [];
		let minMembers = Number.POSITIVE_INFINITY;
		/** @type {number | undefined} */
		let minSize;
		for (const { source, test } of this._staticCacheGroupSources) {
			const cacheGroup = this._getCacheGroup(source);
			if (
				cacheGroup.usedExports !== usedExports ||
				cacheGroup.getName !== defaultGetName ||
				(!cacheGroup._validateSize && !cacheGroup._validateSizeReduction)
			) {
				continue;
			}
			groups.push({ test, minSize: cacheGroup.minSize });
			minMembers = Math.min(minMembers, Math.max(1, cacheGroup.minChunks));
			if (minSize === 0) continue;
			// A chunk filter can map two intersections onto the same selected
			// chunks, where only the modules of both together reach `minSize`, so
			// a bound holds only for groups taking the chunks as they are.

			// TODO intersect what a filter selects, where every group shares one,
			// so a filtered build is bounded as well
			if (
				cacheGroup.chunksFilter !== ALL_CHUNK_FILTER ||
				!cacheGroup._validateSize
			) {
				minSize = 0;
				continue;
			}
			for (const size of Object.values(cacheGroup.minSize)) {
				if (size > 0 && (minSize === undefined || size < minSize)) {
					minSize = size;
				}
			}
		}
		if (groups.length === 0) return undefined;
		return { minSize: minSize || 0, minMembers, groups };
	}

	/**
	 * Returns the cache group (cached).
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
		const minSizeReduction = mergeSizes(
			cacheGroupSource.minSizeReduction,
			cacheGroupSource.enforce ? undefined : this.options.minSizeReduction
		);
		const minRemainingSize = mergeSizes(
			cacheGroupSource.minRemainingSize,
			cacheGroupSource.enforce ? undefined : this.options.minRemainingSize
		);
		const enforceSizeThreshold = mergeSizes(
			cacheGroupSource.enforceSizeThreshold,
			cacheGroupSource.enforce ? undefined : this.options.enforceSizeThreshold
		);
		/** @type {CacheGroup} */
		const cacheGroup = {
			key: cacheGroupSource.key,
			priority: cacheGroupSource.priority || 0,
			chunksFilter: cacheGroupSource.chunksFilter || this.options.chunksFilter,
			minSize,
			minSizeReduction,
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
			_validateSizeReduction: hasNonZeroSizes(minSizeReduction),
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
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cachedMakePathsRelative = makePathsRelative.bindContextCache(
			compiler.context,
			compiler.root
		);
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const logger = compilation.getLogger(`webpack.${PLUGIN_NAME}`);
			let alreadyOptimized = false;
			compilation.hooks.unseal.tap(PLUGIN_NAME, () => {
				alreadyOptimized = false;
			});
			compilation.hooks.optimizeChunks.tap(
				{
					name: PLUGIN_NAME,
					stage: STAGE_ADVANCED
				},
				(chunks) => {
					if (alreadyOptimized) return;
					alreadyOptimized = true;
					const { performance } = compilation.options;
					// Mirrors both of `SplitChunksCappedPlugin`'s gates: a build that
					// would not report records nothing and allocates nothing.
					/** @type {CappedSplit[] | undefined} */
					let cappedSplits;
					if (
						performance !== false &&
						performance.splitChunksCapped === true &&
						Boolean(performance.hints)
					) {
						cappedSplits = [];
						CAPPED_SPLITS.set(compilation, cappedSplits);
					}
					logger.time("prepare");
					const chunkGraph = compilation.chunkGraph;
					const moduleGraph = compilation.moduleGraph;
					// Rounds of discovery: what the option says, or what the mode implies,
					// as a plugin constructed by hand reads no defaults
					const dedupDepth =
						this.options.dedupDepth === undefined
							? compiler.options.mode === "development" ||
								compiler.options.mode === "none"
								? 0
								: 1
							: this.options.dedupDepth;
					const intersectionSettings = this._getIntersectionSettings(
						false,
						dedupDepth
					);
					const exportsIntersectionSettings = this._getIntersectionSettings(
						true,
						dedupDepth
					);
					// Chunks in the index intersection discovery works in, built only
					// when a cache group would take an intersection
					/** @type {Chunk[] | undefined} */
					const intersectionChunks =
						intersectionSettings === undefined &&
						exportsIntersectionSettings === undefined
							? undefined
							: [];
					// The index of each of those chunks
					/** @type {Map<Chunk, number>} */
					const intersectionChunkIndices = new Map();
					// Give each selected chunk an index (to create strings from chunks)
					/** @type {Map<Chunk, bigint>} */
					const chunkIndexMap = new Map();
					// Dense per-chunk index, folded into the 64 bit membership
					// signatures that reject non-subsets in getCombinations
					/** @type {Map<Chunk, number>} */
					const chunkSignatureBitMap = new Map();
					const ZERO = BigInt("0");
					const ONE = BigInt("1");
					const START = ONE << BigInt("31");
					let index = START;
					let denseIndex = 0;
					for (const chunk of chunks) {
						chunkIndexMap.set(
							chunk,
							index | BigInt((Math.random() * 0x7fffffff) | 0)
						);
						chunkSignatureBitMap.set(chunk, denseIndex++ & 63);
						if (intersectionChunks !== undefined) {
							intersectionChunkIndices.set(chunk, intersectionChunks.length);
							intersectionChunks.push(chunk);
						}
						index <<= ONE;
					}
					/**
					 * Returns key of the chunks.
					 * @param {Iterable<Chunk, undefined, undefined>} chunks list of chunks
					 * @returns {bigint | Chunk} key of the chunks
					 */
					const getKey = (chunks) => {
						const iterator = chunks[Symbol.iterator]();
						let result = iterator.next();
						if (result.done) return ZERO;
						const first = result.value;
						result = iterator.next();
						if (result.done) return first;
						let key =
							/** @type {bigint} */ (chunkIndexMap.get(first)) |
							/** @type {bigint} */ (chunkIndexMap.get(result.value));
						while (!(result = iterator.next()).done) {
							const raw = chunkIndexMap.get(result.value);
							key ^= /** @type {bigint} */ (raw);
						}
						return key;
					};
					/**
					 * Returns stringified key.
					 * @param {bigint | Chunk} key key of the chunks
					 * @returns {string} stringified key
					 */
					const keyToString = (key) => {
						if (typeof key === "bigint") return key.toString(16);
						return /** @type {bigint} */ (chunkIndexMap.get(key)).toString(16);
					};

					/**
					 * Most a module can weigh towards an intersection of these cache groups, `0`
					 * when none of them takes it and `Infinity` when a size of it is unknown or
					 * bounded by nothing.
					 * @param {Module} module the module
					 * @param {IntersectionCacheGroup[]} groups the cache groups taking the intersections
					 * @returns {number} the bound
					 */
					const getModuleSizeBound = (module, groups) => {
						// A native test is exact, so a module no group accepts weighs nothing. A
						// callback stays a possible match rather than being called a second time.
						if (!groups.some(({ test }) => matchesStaticTest(test, module))) {
							return 0;
						}
						let bound = 0;
						let types = 0;
						for (const type of module.getSourceTypes()) {
							types++;
							for (const { minSize } of groups) {
								// Without a threshold on this type, arbitrarily few bytes of it survive
								// minSize, so nothing about this module bounds anything
								if (!(minSize[type] > 0)) return Number.POSITIVE_INFINITY;
							}
							const size = module.size(type);
							if (!(size >= 0) || size === Number.POSITIVE_INFINITY) {
								return Number.POSITIVE_INFINITY;
							}
							bound += size;
						}
						return types === 0 ? Number.POSITIVE_INFINITY : bound;
					};

					/** Whether discovery of these sets prunes by size. */
					const boundsChunkSetSizes =
						intersectionSettings !== undefined &&
						intersectionSettings.minSize > 0;
					const boundsExportsChunkSetSizes =
						exportsIntersectionSettings !== undefined &&
						exportsIntersectionSettings.minSize > 0;

					const getChunkSetsInGraph = memoize(() => {
						/** @type {Map<bigint, ChunkSet>} */
						const chunkSetsInGraph = new Map();
						/** @type {ChunkSet} */
						const singleChunkSets = new Set();
						// Only what a chunk set's own modules weigh, and only where a bound on it
						// can reject an intersection
						/** @type {Map<bigint | Chunk, number> | undefined} */
						const sizeByKey = boundsChunkSetSizes ? new Map() : undefined;
						const groups = boundsChunkSetSizes
							? /** @type {IntersectionCacheGroup[]} */ (
									/** @type {IntersectionSettings} */ (intersectionSettings)
										.groups
								)
							: undefined;
						for (const module of compilation.modules) {
							const chunks = chunkGraph.getModuleChunksIterable(module);
							const chunksKey = getKey(chunks);
							if (typeof chunksKey === "bigint") {
								if (!chunkSetsInGraph.has(chunksKey)) {
									chunkSetsInGraph.set(chunksKey, new Set(chunks));
								}
							} else {
								singleChunkSets.add(chunksKey);
							}
							if (sizeByKey !== undefined) {
								sizeByKey.set(
									chunksKey,
									(sizeByKey.get(chunksKey) || 0) +
										getModuleSizeBound(
											module,
											/** @type {IntersectionCacheGroup[]} */ (groups)
										)
								);
							}
						}
						return { chunkSetsInGraph, singleChunkSets, sizeByKey };
					});

					/**
					 * Group chunks by exports.
					 * @param {Module} module the module
					 * @returns {Iterable<Chunk[]>} groups of chunks with equal exports
					 */
					const groupChunksByExports = (module) => {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						/** @type {Map<string, Chunk[]>} */
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

					/** @typedef {Map<bigint | Chunk, ChunkSet>} ChunkSetsInGraph */

					const getExportsChunkSetsInGraph = memoize(() => {
						/** @type {ChunkSetsInGraph} */
						const chunkSetsInGraph = new Map();
						/** @type {ChunkSet} */
						const singleChunkSets = new Set();
						// A module counts towards every group it appears in, which can only
						// overstate a group, never hide an intersection worth splitting
						/** @type {Map<bigint | Chunk, number> | undefined} */
						const sizeByKey = boundsExportsChunkSetSizes
							? new Map()
							: undefined;
						const groups = boundsExportsChunkSetSizes
							? /** @type {IntersectionCacheGroup[]} */ (
									/** @type {IntersectionSettings} */ (
										exportsIntersectionSettings
									).groups
								)
							: undefined;
						for (const module of compilation.modules) {
							const groupedChunks = [...groupChunksByExports(module)];
							groupedByExportsMap.set(module, groupedChunks);
							for (const chunks of groupedChunks) {
								const chunksKey = getKey(chunks);
								if (chunks.length === 1) {
									singleChunkSets.add(chunks[0]);
								} else if (!chunkSetsInGraph.has(chunksKey)) {
									chunkSetsInGraph.set(chunksKey, new Set(chunks));
								}
								if (sizeByKey !== undefined) {
									sizeByKey.set(
										chunksKey,
										(sizeByKey.get(chunksKey) || 0) +
											getModuleSizeBound(
												module,
												/** @type {IntersectionCacheGroup[]} */ (groups)
											)
									);
								}
							}
						}
						return { chunkSetsInGraph, singleChunkSets, sizeByKey };
					});

					/**
					 * Chunk sets of equal size, with a 64 bit membership signature
					 * per set stored as two words at `2 * i` in `signatures`.
					 * @typedef {object} ChunkSetGroup
					 * @property {ChunkSet[]} sets the chunk sets
					 * @property {Uint32Array} signatures two signature words per set
					 */

					/** @typedef {Map<CountOfChunk, ChunkSetGroup>} ChunkSetsByCount */

					// holds the signature of the set currently being combined; transient
					const signatureScratch = new Uint32Array(2);

					/**
					 * Folds a chunk set into a 64 bit membership signature.
					 * @param {ChunkSet} chunksSet set of chunks
					 * @param {Uint32Array} out target array
					 * @param {number} offset index of the first of the two words
					 * @returns {void}
					 */
					const writeSignature = (chunksSet, out, offset) => {
						out[offset] = 0;
						out[offset + 1] = 0;
						for (const chunk of chunksSet) {
							const bit = /** @type {number} */ (
								chunkSignatureBitMap.get(chunk)
							);
							out[offset + (bit >> 5)] |= 1 << (bit & 31);
						}
					};

					// group these set of chunks by count
					// to allow to check less sets via isSubset
					// (only smaller sets can be subset)
					/**
					 * Group chunk sets by count.
					 * @param {IterableIterator<ChunkSet>} chunkSets set of sets of chunks
					 * @returns {ChunkSetsByCount} map of sets of chunks by count
					 */
					const groupChunkSetsByCount = (chunkSets) => {
						/** @type {ChunkSetsByCount} */
						const chunkSetsByCount = new Map();
						for (const chunksSet of chunkSets) {
							const count = chunksSet.size;
							let group = chunkSetsByCount.get(count);
							if (group === undefined) {
								group = { sets: [], signatures: EMPTY_SIGNATURES };
								chunkSetsByCount.set(count, group);
							}
							group.sets.push(chunksSet);
						}
						for (const group of chunkSetsByCount.values()) {
							const { sets } = group;
							const signatures = new Uint32Array(sets.length * 2);
							for (let i = 0; i < sets.length; i++) {
								writeSignature(sets[i], signatures, i * 2);
							}
							group.signatures = signatures;
						}
						return chunkSetsByCount;
					};
					const getChunkSetsByCount = memoize(() =>
						groupChunkSetsByCount(
							getChunkSetsInGraph().chunkSetsInGraph.values()
						)
					);
					const getExportsChunkSetsByCount = memoize(() =>
						groupChunkSetsByCount(
							getExportsChunkSetsInGraph().chunkSetsInGraph.values()
						)
					);

					/**
					 * Discovers the intersections of the chunk sets that are not chunk sets
					 * themselves, and groups them by the sets holding all of their chunks.
					 * @param {ChunkSetsInGraph} chunkSets the chunk sets in the graph
					 * @param {ChunkSet} singleChunkSets the chunks holding modules of their own
					 * @param {Map<bigint | Chunk, number> | undefined} sizeByKey size of the modules behind each chunk set
					 * @param {IntersectionSettings} settings what the cache groups taking them allow
					 * @returns {Map<bigint | Chunk, ChunkSet[]>} intersections by the key of each set holding them
					 */
					const discoverChunkSetIntersections = (
						chunkSets,
						singleChunkSets,
						sizeByKey,
						settings
					) => {
						/** @type {Map<bigint | Chunk, ChunkSet[]>} */
						const result = new Map();
						if (chunkSets.size < 2) return result;
						// Widest sets first, so a limit keeps the intersections reaching the most
						// chunks, and by key after that, so no module order reaches the result
						/** @type {(bigint | Chunk)[]} */
						const keys = [...chunkSets.keys()].sort((a, b) => {
							const countDiff =
								/** @type {ChunkSet} */ (chunkSets.get(b)).size -
								/** @type {ChunkSet} */ (chunkSets.get(a)).size;
							if (countDiff !== 0) return countDiff;
							return a < b ? -1 : 1;
						});
						let memberCount = 0;
						for (const set of chunkSets.values()) memberCount += set.size;
						// A one chunk intersection holds only what a chunk of its own already holds,
						// so those sets are inputs for what they weigh and the sets holding them
						const multiSetCount = keys.length;
						if (settings.minMembers < 2) {
							for (const chunk of singleChunkSets) keys.push(chunk);
							memberCount += keys.length - multiSetCount;
						}
						const setCount = keys.length;
						const offsets = new Int32Array(setCount + 1);
						const members = new Int32Array(memberCount);
						const sizes =
							sizeByKey === undefined ? undefined : new Float64Array(setCount);
						let cursor = 0;
						for (let i = 0; i < setCount; i++) {
							const key = keys[i];
							if (sizes !== undefined) {
								sizes[i] =
									/** @type {Map<bigint | Chunk, number>} */ (sizeByKey).get(
										key
									) || 0;
							}
							offsets[i] = cursor;
							if (i < multiSetCount) {
								for (const chunk of /** @type {ChunkSet} */ (
									chunkSets.get(key)
								)) {
									members[cursor++] = /** @type {number} */ (
										intersectionChunkIndices.get(chunk)
									);
								}
							} else {
								members[cursor++] = /** @type {number} */ (
									intersectionChunkIndices.get(/** @type {Chunk} */ (key))
								);
							}
							offsets[i + 1] = cursor;
						}
						const { intersections, capped } = discoverIntersections({
							setCount,
							memberCount: intersectionChunkIndices.size,
							offsets,
							members,
							depth: dedupDepth,
							minMembers: settings.minMembers,
							sizes,
							minSize: settings.minSize,
							maxIntersections: MAX_INTERSECTIONS,
							maxWork: MAX_INTERSECTION_WORK
						});
						if (capped) {
							logger.warn(
								`Stopped looking for chunk sets to share modules through at ${MAX_INTERSECTIONS} of them, or at the work of intersecting ${MAX_INTERSECTION_WORK} words. Some modules chunks share stay where they are. Lower "optimization.splitChunks.dedupDepth" to spend less on the search.`
							);
						}
						const chunkList = /** @type {Chunk[]} */ (intersectionChunks);
						for (const { members: chunkIndices, support } of intersections) {
							/** @type {ChunkSet} */
							const intersection = new Set();
							for (const index of chunkIndices) {
								intersection.add(chunkList[index]);
							}
							for (const set of support) {
								// The one intersection a single chunk could hold is that chunk, which
								// is a combination of its modules already
								if (set >= multiSetCount) continue;
								const key = keys[set];
								const held = result.get(key);
								if (held === undefined) result.set(key, [intersection]);
								else held.push(intersection);
							}
						}
						return result;
					};

					// How many combinations of each chunk set are chunk sets in the graph, for the
					// cache groups that take no intersections. Missing means all of them.
					/** @type {Map<Combinations, number>} */
					const originalCombinationCounts = new Map();
					/** @type {Map<Combinations, number>} */
					const originalExportsCombinationCounts = new Map();

					// TODO rebuild the candidates per cache group priority, from the
					// module chunk edges the priorities before it left, as rspack does
					const getIntersectionsByChunkSetKey = memoize(() => {
						const { chunkSetsInGraph, singleChunkSets, sizeByKey } =
							getChunkSetsInGraph();
						return discoverChunkSetIntersections(
							chunkSetsInGraph,
							singleChunkSets,
							sizeByKey,
							/** @type {IntersectionSettings} */ (intersectionSettings)
						);
					});
					const getExportsIntersectionsByChunkSetKey = memoize(() => {
						const { chunkSetsInGraph, singleChunkSets, sizeByKey } =
							getExportsChunkSetsInGraph();
						return discoverChunkSetIntersections(
							chunkSetsInGraph,
							singleChunkSets,
							sizeByKey,
							/** @type {IntersectionSettings} */ (exportsIntersectionSettings)
						);
					});

					/** @typedef {(ChunkSet | Chunk)[]} Combinations */

					/**
					 * Appends the intersections a chunk set holds to its combinations.
					 * @param {bigint | Chunk} key key of the chunk set
					 * @param {Combinations} combinations its combinations
					 * @param {() => Map<bigint | Chunk, ChunkSet[]>} getIntersectionsByKey takes the intersections held by each chunk set
					 * @param {Map<Combinations, number>} originalCounts takes how many of them are chunk sets themselves
					 * @returns {void}
					 */
					const appendIntersections = (
						key,
						combinations,
						getIntersectionsByKey,
						originalCounts
					) => {
						// The chunk sets stay in front, so a cache group taking no
						// intersection reads only up to their count
						originalCounts.set(combinations, combinations.length);
						const intersections = getIntersectionsByKey().get(key);
						if (intersections === undefined) return;
						for (const intersection of intersections) {
							combinations.push(intersection);
						}
					};

					// Create a list of possible combinations
					/**
					 * Creates a get combinations.
					 * @param {ChunkSetsInGraph} chunkSets chunk sets
					 * @param {ChunkSet} singleChunkSets single chunks sets
					 * @param {ChunkSetsByCount} chunkSetsByCount chunk sets by count
					 * @param {(() => Map<bigint | Chunk, ChunkSet[]>) | undefined} getIntersectionsByKey takes the intersections held by each chunk set, on the first cache group asking for them
					 * @param {Map<Combinations, number>} originalCounts takes how many of a chunk set's combinations are chunk sets themselves
					 * @returns {(key: bigint | Chunk, withIntersections: boolean) => Combinations} combinations
					 */
					const createGetCombinations = (
						chunkSets,
						singleChunkSets,
						chunkSetsByCount,
						getIntersectionsByKey,
						originalCounts
					) => {
						/** @type {Map<bigint | Chunk, Combinations>} */
						const combinationsCache = new Map();

						return (key, withIntersections) => {
							const cacheEntry = combinationsCache.get(key);
							if (cacheEntry !== undefined) {
								// Nothing is discovered until a cache group that takes the
								// intersections reaches a chunk set of more than one chunk
								if (
									withIntersections &&
									getIntersectionsByKey !== undefined &&
									!(cacheEntry[0] instanceof Chunk) &&
									!originalCounts.has(cacheEntry)
								) {
									appendIntersections(
										key,
										cacheEntry,
										getIntersectionsByKey,
										originalCounts
									);
								}
								return cacheEntry;
							}
							if (key instanceof Chunk) {
								const result = [key];
								combinationsCache.set(key, result);
								return result;
							}
							const chunksSet =
								/** @type {ChunkSet} */
								(chunkSets.get(key));
							/** @type {Combinations} */
							const array = [chunksSet];
							writeSignature(chunksSet, signatureScratch, 0);
							const selfLow = signatureScratch[0];
							const selfHigh = signatureScratch[1];
							for (const [count, group] of chunkSetsByCount) {
								// "equal" is not needed because they would have been merge in the first step
								if (count < chunksSet.size) {
									const { sets, signatures } = group;
									for (let i = 0; i < sets.length; i++) {
										// a subset cannot hold a signature bit the superset lacks,
										// so this rejects nearly every candidate without touching the Set
										const offset = i * 2;
										if (
											(signatures[offset] & ~selfLow) !== 0 ||
											(signatures[offset + 1] & ~selfHigh) !== 0
										) {
											continue;
										}
										const set = sets[i];
										if (isSubset(chunksSet, set)) {
											array.push(set);
										}
									}
								}
							}
							for (const chunk of singleChunkSets) {
								if (chunksSet.has(chunk)) {
									array.push(chunk);
								}
							}
							combinationsCache.set(key, array);
							if (withIntersections && getIntersectionsByKey !== undefined) {
								appendIntersections(
									key,
									array,
									getIntersectionsByKey,
									originalCounts
								);
							}
							return array;
						};
					};

					const getCombinationsFactory = memoize(() => {
						const { chunkSetsInGraph, singleChunkSets } = getChunkSetsInGraph();
						return createGetCombinations(
							chunkSetsInGraph,
							singleChunkSets,
							getChunkSetsByCount(),
							intersectionSettings === undefined
								? undefined
								: getIntersectionsByChunkSetKey,
							originalCombinationCounts
						);
					});

					/**
					 * Returns combinations by key.
					 * @param {bigint | Chunk} key key
					 * @param {boolean} withIntersections whether to take the intersections of the chunk sets too
					 * @returns {Combinations} combinations by key
					 */
					const getCombinations = (key, withIntersections) =>
						getCombinationsFactory()(key, withIntersections);

					const getExportsCombinationsFactory = memoize(() => {
						const { chunkSetsInGraph, singleChunkSets } =
							getExportsChunkSetsInGraph();
						return createGetCombinations(
							chunkSetsInGraph,
							singleChunkSets,
							getExportsChunkSetsByCount(),
							exportsIntersectionSettings === undefined
								? undefined
								: getExportsIntersectionsByChunkSetKey,
							originalExportsCombinationCounts
						);
					});
					/**
					 * Gets exports combinations.
					 * @param {bigint | Chunk} key key
					 * @param {boolean} withIntersections whether to take the intersections of the chunk sets too
					 * @returns {Combinations} exports combinations by key
					 */
					const getExportsCombinations = (key, withIntersections) =>
						getExportsCombinationsFactory()(key, withIntersections);

					/**
					 * Defines the selected chunks result type used by this module.
					 * @typedef {object} SelectedChunksResult
					 * @property {Chunk[]} chunks the list of chunks
					 * @property {bigint | Chunk} key a key of the list
					 */

					/** @typedef {WeakMap<ChunkFilterFn, SelectedChunksResult>} ChunkMap */
					/** @type {WeakMap<ChunkSet | Chunk, ChunkMap>} */
					const selectedChunksCacheByChunksSet = new WeakMap();

					/**
					 * get list and key by applying the filter function to the list
					 * It is cached for performance reasons
					 * @param {ChunkSet | Chunk} chunks list of chunks
					 * @param {ChunkFilterFn} chunkFilter filter function for chunks
					 * @returns {SelectedChunksResult} list and key
					 */
					const getSelectedChunks = (chunks, chunkFilter) => {
						let entry = selectedChunksCacheByChunksSet.get(chunks);
						if (entry === undefined) {
							/** @type {ChunkMap} */
							entry = new WeakMap();
							selectedChunksCacheByChunksSet.set(chunks, entry);
						}
						let entry2 =
							/** @type {SelectedChunksResult} */
							(entry.get(chunkFilter));
						if (entry2 === undefined) {
							/** @type {Chunk[]} */
							const selectedChunks = [];
							if (chunks instanceof Chunk) {
								if (chunkFilter(chunks)) selectedChunks.push(chunks);
							} else {
								for (const chunk of chunks) {
									if (chunkFilter(chunk)) selectedChunks.push(chunk);
								}
							}
							entry2 = {
								chunks: selectedChunks,
								key: getKey(selectedChunks)
							};
							entry.set(chunkFilter, entry2);
						}
						return entry2;
					};

					/** @type {Map<string, boolean>} */
					const alreadyValidatedParents = new Map();
					/** @type {Set<string>} */
					const alreadyReportedErrors = new Set();

					// Map a list of chunks to a list of modules
					// For the key the chunk "index" is used, the value is a SortableSet of modules
					/** @type {Map<string, ChunksInfoItem>} */
					const chunksInfoMap = new Map();

					// The unnamed key is derived only from cache group and chunk set, so it
					// repeats for every module sharing that pair — build the string once
					/** @type {Map<CacheGroup, Map<bigint | Chunk, string>>} */
					const unnamedKeyCache = new Map();

					/**
					 * Returns the chunksInfoMap key for a cache group and chunk set.
					 * @param {CacheGroup} cacheGroup the current cache group
					 * @param {bigint | Chunk} selectedChunksKey a key of selectedChunks
					 * @returns {string} key into chunksInfoMap
					 */
					const getUnnamedKey = (cacheGroup, selectedChunksKey) => {
						let byChunksKey = unnamedKeyCache.get(cacheGroup);
						if (byChunksKey === undefined) {
							byChunksKey = new Map();
							unnamedKeyCache.set(cacheGroup, byChunksKey);
						}
						let key = byChunksKey.get(selectedChunksKey);
						if (key === undefined) {
							key = `${cacheGroup.key} chunks:${keyToString(selectedChunksKey)}`;
							byChunksKey.set(selectedChunksKey, key);
						}
						return key;
					};

					/**
					 * Adds module to chunks info map.
					 * @param {CacheGroup} cacheGroup the current cache group
					 * @param {number} cacheGroupIndex the index of the cache group of ordering
					 * @param {Chunk[]} selectedChunks chunks selected for this module
					 * @param {bigint | Chunk} selectedChunksKey a key of selectedChunks
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

						const name =
							/** @type {GetNameFn} */
							(cacheGroup.getName)(module, selectedChunks, cacheGroup.key);
						// Check if the name is ok
						const existingChunk = name && compilation.namedChunks.get(name);
						if (existingChunk) {
							const parentValidationKey = `${name}|${
								typeof selectedChunksKey === "bigint"
									? selectedChunksKey
									: selectedChunksKey.debugId
							}`;
							const valid = alreadyValidatedParents.get(parentValidationKey);
							if (valid === false) return;
							if (valid === undefined) {
								// Module can only be moved into the existing chunk if the existing chunk
								// is a parent of all selected chunks
								let isInAllParents = true;
								/** @type {Set<ChunkGroup>} */
								const queue = new Set();
								for (const chunk of selectedChunks) {
									for (const group of chunk.groupsIterable) {
										queue.add(group);
									}
								}
								for (const group of queue) {
									if (existingChunk.isInGroup(group)) continue;
									let hasParent = false;
									for (const parent of group.parentsIterable) {
										hasParent = true;
										queue.add(parent);
									}
									if (!hasParent) {
										isInAllParents = false;
									}
								}
								const valid = isInAllParents;
								alreadyValidatedParents.set(parentValidationKey, valid);
								if (!valid) {
									if (!alreadyReportedErrors.has(name)) {
										alreadyReportedErrors.add(name);
										compilation.errors.push(
											new WebpackError(
												`${PLUGIN_NAME}\n` +
													`Cache group "${cacheGroup.key}" conflicts with existing chunk.\n` +
													`Both have the same name "${name}" and existing chunk is not a parent of the selected modules.\n` +
													"Use a different name for the cache group or make sure that the existing chunk is a parent (e. g. via dependOn).\n" +
													'HINT: You can omit "name" to automatically create a name.\n' +
													"BREAKING CHANGE: webpack < 5 used to allow to use an entrypoint as splitChunk. " +
													"This is no longer allowed when the entrypoint is not a parent of the selected modules.\n" +
													"Remove this entrypoint and add modules to cache group's 'test' instead. " +
													"If you need modules to be evaluated on startup, add them to the existing entrypoints (make them arrays). " +
													"See migration guide of more info."
											)
										);
									}
									return;
								}
							}
						}
						// A named group keys on its name, which merges equal names by itself;
						// an unnamed one keys on its chunks and cache group.
						const key = name
							? `${cacheGroup.key} name:${name}`
							: getUnnamedKey(cacheGroup, selectedChunksKey);
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
									chunksKeys: new Set()
								})
							);
						}
						const oldSize = info.modules.size;
						info.modules.add(module);
						if (info.modules.size !== oldSize) {
							for (const type of module.getSourceTypes()) {
								info.sizes[type] = (info.sizes[type] || 0) + module.size(type);
							}
						}
						const oldChunksKeysSize = info.chunksKeys.size;
						info.chunksKeys.add(selectedChunksKey);
						if (oldChunksKeysSize !== info.chunksKeys.size) {
							for (const chunk of selectedChunks) {
								info.chunks.add(chunk);
							}
						}
					};

					const context = {
						moduleGraph,
						chunkGraph
					};

					/**
					 * Returns combinations of the chunks the module is in.
					 * @param {Module} module the module
					 * @param {boolean} withIntersections whether to take the intersections of the chunk sets too
					 * @returns {Combinations} chunk combinations
					 */
					const computeCombinations = (module, withIntersections) =>
						getCombinations(
							getKey(chunkGraph.getModuleChunksIterable(module)),
							withIntersections
						);

					/**
					 * Returns combinations of the module's chunks grouped by used exports.
					 * @param {Module} module the module
					 * @param {boolean} withIntersections whether to take the intersections of the chunk sets too
					 * @returns {Combinations} chunk combinations
					 */
					const computeCombinationsByUsedExports = (
						module,
						withIntersections
					) => {
						// fill the groupedByExportsMap
						getExportsChunkSetsInGraph();
						/** @type {Combinations} */
						const array = [];
						/** @type {Set<ChunkSet | Chunk>} */
						const seen = new Set();
						const groupedByUsedExports =
							/** @type {Iterable<Chunk[]>} */
							(groupedByExportsMap.get(module));
						for (const chunks of groupedByUsedExports) {
							const combinations = getExportsCombinations(
								getKey(chunks),
								withIntersections
							);
							let end = combinations.length;
							if (
								!withIntersections &&
								originalExportsCombinationCounts.size !== 0
							) {
								const originals =
									originalExportsCombinationCounts.get(combinations);
								if (originals !== undefined) end = originals;
							}
							for (let i = 0; i < end; i++) {
								const combination = combinations[i];
								const known = seen.size;
								seen.add(combination);
								if (seen.size !== known) array.push(combination);
							}
						}
						return array;
					};

					/**
					 * Whether a cache group puts the intersections of the chunk sets to use. Only
					 * one naming its chunk after the modules it takes, and holding out for a size,
					 * can group modules that no chunk set holds together.
					 * @param {CacheGroup} cacheGroup the cache group
					 * @returns {boolean} true when it takes them
					 */
					const takesIntersections = (cacheGroup) =>
						intersectionChunks !== undefined &&
						(cacheGroup.usedExports
							? exportsIntersectionSettings
							: intersectionSettings) !== undefined &&
						cacheGroup.getName === defaultGetName &&
						(cacheGroup._validateSize || cacheGroup._validateSizeReduction);

					logger.timeEnd("prepare");

					logger.time("modules");

					// Walk through all modules
					for (const module of compilation.modules) {
						// Get cache group
						const cacheGroups = this.options.getCacheGroups(module, context);
						if (!Array.isArray(cacheGroups) || cacheGroups.length === 0) {
							continue;
						}

						// Computed at most once per module, on first use by a cache group
						/** @type {Combinations | undefined} */
						let combsCache;
						let combsCacheHasIntersections = false;
						/** @type {(Combinations | undefined)[] | undefined} */
						let combsByUsedExportsCache;

						let cacheGroupIndex = 0;
						for (const cacheGroupSource of cacheGroups) {
							const cacheGroup = this._getCacheGroup(cacheGroupSource);
							const withIntersections = takesIntersections(cacheGroup);
							/** @type {Combinations} */
							let combs;
							let end;
							if (cacheGroup.usedExports) {
								if (combsByUsedExportsCache === undefined) {
									combsByUsedExportsCache = [];
								}
								const index = withIntersections ? 1 : 0;
								let cached = combsByUsedExportsCache[index];
								if (cached === undefined) {
									cached = computeCombinationsByUsedExports(
										module,
										withIntersections
									);
									combsByUsedExportsCache[index] = cached;
								}
								combs = cached;
								end = cached.length;
							} else {
								if (
									combsCache === undefined ||
									(withIntersections && !combsCacheHasIntersections)
								) {
									combsCache = computeCombinations(module, withIntersections);
									combsCacheHasIntersections = withIntersections;
								}
								combs = combsCache;
								// The intersections trail the chunk sets, so a cache group
								// that takes none of them stops where they begin
								end = combs.length;
								if (
									!withIntersections &&
									originalCombinationCounts.size !== 0
								) {
									const originals = originalCombinationCounts.get(combs);
									if (originals !== undefined) end = originals;
								}
							}
							// For all combination of chunk selection
							for (let i = 0; i < end; i++) {
								const chunkCombination = combs[i];
								// Break if minimum number of chunks is not reached
								const count =
									chunkCombination instanceof Chunk ? 1 : chunkCombination.size;
								if (count < cacheGroup.minChunks) continue;
								// Select chunks by configuration
								const { chunks: selectedChunks, key: selectedChunksKey } =
									getSelectedChunks(
										chunkCombination,
										/** @type {ChunkFilterFn} */
										(cacheGroup.chunksFilter)
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

					/**
					 * Removes modules with source type.
					 * @param {ChunksInfoItem} info entry
					 * @param {SourceTypes} sourceTypes source types to be removed
					 */
					const removeModulesWithSourceType = (info, sourceTypes) => {
						for (const module of info.modules) {
							const types = module.getSourceTypes();
							if (sourceTypes.some((type) => types.has(type))) {
								info.modules.delete(module);
								for (const type of types) {
									info.sizes[type] -= module.size(type);
								}
							}
						}
					};

					/**
					 * Removes min size violating modules.
					 * @param {ChunksInfoItem} info entry
					 * @returns {boolean} true, if entry become empty
					 */
					const removeMinSizeViolatingModules = (info) => {
						if (!info.cacheGroup._validateSize) return false;
						const violatingSizes = getViolatingMinSizes(
							info.sizes,
							info.cacheGroup.minSize
						);
						if (violatingSizes === undefined) return false;
						removeModulesWithSourceType(info, violatingSizes);
						return info.modules.size === 0;
					};

					// Filter items were size < minSize
					for (const [key, info] of chunksInfoMap) {
						if (removeMinSizeViolatingModules(info)) {
							chunksInfoMap.delete(key);
						} else if (
							!checkMinSizeReduction(
								info.sizes,
								info.cacheGroup.minSizeReduction,
								info.chunks.size
							)
						) {
							chunksInfoMap.delete(key);
						}
					}

					/**
					 * Defines the max size queue item type used by this module.
					 * @typedef {object} MaxSizeQueueItem
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
						/** @type {undefined | string} */
						let bestEntryKey;
						/** @type {undefined | ChunksInfoItem} */
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

						const item = /** @type {ChunksInfoItem} */ (bestEntry);
						chunksInfoMap.delete(/** @type {string} */ (bestEntryKey));

						/** @type {ChunkName | undefined} */
						let chunkName = item.name;
						// Variable for the new chunk (lazy created)
						/** @type {Chunk | undefined} */
						let newChunk;
						// When no chunk name, check if we can reuse a chunk instead of creating a new one
						let isExistingChunk = false;
						let isReusedWithAllModules = false;
						if (chunkName) {
							const chunkByName = compilation.namedChunks.get(chunkName);
							if (chunkByName !== undefined) {
								newChunk = chunkByName;
								const oldSize = item.chunks.size;
								item.chunks.delete(newChunk);
								isExistingChunk = item.chunks.size !== oldSize;
							}
						} else if (item.cacheGroup.reuseExistingChunk) {
							outer: for (const chunk of item.chunks) {
								if (
									chunkGraph.getNumberOfChunkModules(chunk) !==
									item.modules.size
								) {
									continue;
								}
								if (
									item.chunks.size > 1 &&
									chunkGraph.getNumberOfEntryModules(chunk) > 0
								) {
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

						const enforced =
							item.cacheGroup._conditionalEnforce &&
							checkMinSize(item.sizes, item.cacheGroup.enforceSizeThreshold);

						/** @type {Set<Chunk>} */
						const usedChunks = new Set(item.chunks);

						// Check if maxRequests condition can be fulfilled
						if (
							!enforced &&
							(Number.isFinite(item.cacheGroup.maxInitialRequests) ||
								Number.isFinite(item.cacheGroup.maxAsyncRequests))
						) {
							for (const chunk of usedChunks) {
								// respect max requests: a chunk that is both initial and
								// async answers to the stricter of the two caps
								const isOnlyInitial = chunk.isOnlyInitial();
								const byAsyncRequests =
									!isOnlyInitial &&
									(!chunk.canBeInitial() ||
										item.cacheGroup.maxAsyncRequests <
											item.cacheGroup.maxInitialRequests);
								const maxRequests = byAsyncRequests
									? item.cacheGroup.maxAsyncRequests
									: item.cacheGroup.maxInitialRequests;
								if (
									Number.isFinite(maxRequests) &&
									getRequests(chunk) >= maxRequests
								) {
									if (cappedSplits !== undefined) {
										cappedSplits.push({
											cacheGroup: item.cacheGroup.key,
											chunk,
											// which cap it was cannot be read back off the value:
											// the two are equal by default in production
											limit: byAsyncRequests
												? "maxAsyncRequests"
												: "maxInitialRequests",
											maxRequests:
												/** @type {number} */
												(maxRequests),
											modules: item.modules.size
										});
									}
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
							if (isExistingChunk) {
								usedChunks.add(/** @type {Chunk} */ (newChunk));
							}
							if (usedChunks.size >= item.cacheGroup.minChunks) {
								const chunksArr = [...usedChunks];
								// invariant across the module loop below
								const usedChunksKey = getKey(usedChunks);
								for (const module of item.modules) {
									addModuleToChunksInfoMap(
										item.cacheGroup,
										item.cacheGroupIndex,
										chunksArr,
										usedChunksKey,
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
							/** @type {SplitChunksSizes} */
							const chunkSizes = Object.create(null);
							for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
								if (!item.modules.has(module)) {
									for (const type of module.getSourceTypes()) {
										chunkSizes[type] =
											(chunkSizes[type] || 0) + module.size(type);
									}
								}
							}
							const violatingSizes = getViolatingMinSizes(
								chunkSizes,
								item.cacheGroup.minRemainingSize
							);
							if (violatingSizes !== undefined) {
								const oldModulesSize = item.modules.size;
								removeModulesWithSourceType(item, violatingSizes);
								if (
									item.modules.size > 0 &&
									item.modules.size !== oldModulesSize
								) {
									// queue this item again to be processed again
									// without violating modules
									chunksInfoMap.set(/** @type {string} */ (bestEntryKey), item);
								}
								continue;
							}
						}

						// Create the new chunk if not reusing one
						if (newChunk === undefined) {
							newChunk = compilation.addChunk(chunkName);
						}
						// Walk through all chunks
						for (const chunk of usedChunks) {
							// Add graph connections for splitted chunk
							chunk.split(newChunk);
						}

						// Add a note to the chunk
						newChunk.chunkReason =
							(newChunk.chunkReason ? `${newChunk.chunkReason}, ` : "") +
							(isReusedWithAllModules
								? "reused as split chunk"
								: "split chunk");
						if (item.cacheGroup.key) {
							newChunk.chunkReason += ` (cache group: ${item.cacheGroup.key})`;
						}
						if (chunkName) {
							newChunk.chunkReason += ` (name: ${chunkName})`;
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
									? [...oldMaxSizeSettings.keys, item.cacheGroup.key]
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
										removeMinSizeViolatingModules(info) ||
										!checkMinSizeReduction(
											info.sizes,
											info.cacheGroup.minSizeReduction,
											info.chunks.size
										)
									) {
										chunksInfoMap.delete(key);
										continue;
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
					const { fallbackCacheGroup } = this.options;
					for (const chunk of compilation.chunks) {
						const chunkConfig = maxSizeQueueMap.get(chunk);
						const {
							minSize,
							maxAsyncSize,
							maxInitialSize,
							automaticNameDelimiter
						} = chunkConfig || fallbackCacheGroup;
						if (!chunkConfig && !fallbackCacheGroup.chunksFilter(chunk)) {
							continue;
						}
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
						for (const key of /** @type {SourceType[]} */ (
							Object.keys(maxSize)
						)) {
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
								const ident = cachedMakePathsRelative(module.identifier());
								const nameForCondition =
									module.nameForCondition && module.nameForCondition();
								const name = nameForCondition
									? cachedMakePathsRelative(nameForCondition)
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
								/** @type {Sizes} */
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
								if (chunk.filenameTemplate) {
									newPart.filenameTemplate = chunk.filenameTemplate;
								}
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
}

SplitChunksPlugin.getCappedSplits = getCappedSplits;

module.exports = SplitChunksPlugin;
