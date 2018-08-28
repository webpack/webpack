/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

/** @template T @typedef {function(T, T): -1|0|1} Comparator */
/** @template TArg @template T @typedef {function(TArg, T, T): -1|0|1} RawParamizedComparator */
/** @template TArg @template T @typedef {function(TArg): Comparator<T>} ParamizedComparator */

/**
 * @template T
 * @param {RawParamizedComparator<any, T>} fn comparator with argument
 * @returns {ParamizedComparator<any, T>} comparator
 */
const createCachedParamizedComparator = fn => {
	/** @type {WeakMap<object, Comparator<T>>} */
	const map = new WeakMap();
	return arg => {
		const cachedResult = map.get(arg);
		if (cachedResult !== undefined) return cachedResult;
		/**
		 * @param {T} a first item
		 * @param {T} b second item
		 * @returns {-1|0|1} compare result
		 */
		const result = (a, b) => {
			return fn(arg, a, b);
		};
		map.set(arg, result);
		return result;
	};
};

/**
 * @param {Chunk} a chunk
 * @param {Chunk} b chunk
 * @returns {-1|0|1} compare result
 */
exports.compareChunksById = (a, b) => {
	return compareIds(a.id, b.id);
};

/**
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
exports.compareModulesByIdentifier = (a, b) => {
	return compareIds(a.identifier(), b.identifier());
};

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesById = (chunkGraph, a, b) => {
	return compareIds(chunkGraph.getModuleId(a), chunkGraph.getModuleId(b));
};
/** @type {ParamizedComparator<ChunkGraph, Module>} */
exports.compareModulesById = createCachedParamizedComparator(
	compareModulesById
);

/**
 * @param {number} a number
 * @param {number} b number
 * @returns {-1|0|1} compare result
 */
const compareNumbers = (a, b) => {
	if (typeof a !== typeof b) {
		return typeof a < typeof b ? -1 : 1;
	}
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByIndex = (moduleGraph, a, b) => {
	return compareNumbers(
		moduleGraph.getPreOrderIndex(a),
		moduleGraph.getPreOrderIndex(b)
	);
};
/** @type {ParamizedComparator<ModuleGraph, Module>} */
exports.compareModulesByIndex = createCachedParamizedComparator(
	compareModulesByIndex
);

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByIndex2 = (moduleGraph, a, b) => {
	return compareNumbers(
		moduleGraph.getPostOrderIndex(a),
		moduleGraph.getPostOrderIndex(b)
	);
};
/** @type {ParamizedComparator<ModuleGraph, Module>} */
exports.compareModulesByIndex2 = createCachedParamizedComparator(
	compareModulesByIndex2
);

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByIndexOrIdentifier = (moduleGraph, a, b) => {
	const cmp1 = compareNumbers(
		moduleGraph.getPreOrderIndex(a),
		moduleGraph.getPreOrderIndex(b)
	);
	if (cmp1 !== 0) return cmp1;
	const cmp2 = compareIds(a.identifier(), b.identifier());
	return cmp2;
};
/** @type {ParamizedComparator<ModuleGraph, Module>} */
exports.compareModulesByIndexOrIdentifier = createCachedParamizedComparator(
	compareModulesByIndexOrIdentifier
);

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByIdOrIdentifier = (chunkGraph, a, b) => {
	const cmp1 = compareIds(chunkGraph.getModuleId(a), chunkGraph.getModuleId(b));
	if (cmp1 !== 0) return cmp1;
	const cmp2 = compareIds(a.identifier(), b.identifier());
	return cmp2;
};
/** @type {ParamizedComparator<ChunkGraph, Module>} */
exports.compareModulesByIdOrIdentifier = createCachedParamizedComparator(
	compareModulesByIdOrIdentifier
);

/**
 * @param {string|number} a first id
 * @param {string|number} b second id
 * @returns {-1|0|1} compare result
 */
const compareIds = (a, b) => {
	if (typeof a !== typeof b) {
		return typeof a < typeof b ? -1 : 1;
	}
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};

exports.compareIds = compareIds;

/**
 * @template K1 {Object}
 * @template K2
 * @template T
 */
class TwoKeyWeakMap {
	constructor() {
		/** @private @type {WeakMap<any, WeakMap<any, T>>} */
		this._map = new WeakMap();
	}

	/**
	 * @param {K1} key1 first key
	 * @param {K2} key2 second key
	 * @returns {T | undefined} value
	 */
	get(key1, key2) {
		const childMap = this._map.get(key1);
		if (childMap === undefined) {
			return undefined;
		}
		return childMap.get(key2);
	}

	/**
	 * @param {K1} key1 first key
	 * @param {K2} key2 second key
	 * @param {T | undefined} value new value
	 * @returns {void}
	 */
	set(key1, key2, value) {
		let childMap = this._map.get(key1);
		if (childMap === undefined) {
			childMap = new WeakMap();
			this._map.set(key1, childMap);
		}
		childMap.set(key2, value);
	}
}

/** @type {TwoKeyWeakMap<Comparator<any>, Comparator<any>, Comparator<any>>}} */
const concatComparatorsCache = new TwoKeyWeakMap();

/**
 * @template T
 * @param {Comparator<T>} c1 comparator
 * @param {Comparator<T>} c2 comparator
 * @returns {Comparator<T>} comparator
 */
exports.concatComparators = (c1, c2) => {
	const cacheEntry = /** @type {Comparator<T>} */ (concatComparatorsCache.get(
		c1,
		c2
	));
	if (cacheEntry !== undefined) return cacheEntry;
	/**
	 * @param {T} a first value
	 * @param {T} b second value
	 * @returns {-1|0|1} compare result
	 */
	const result = (a, b) => {
		const res = c1(a, b);
		if (res !== 0) return res;
		return c2(a, b);
	};
	concatComparatorsCache.set(c1, c2, result);
	return result;
};

/** @template A, B @typedef {(input: A) => B} Selector */

/** @type {TwoKeyWeakMap<Selector<any, any>, Comparator<any>, Comparator<any>>}} */
const compareSelectCache = new TwoKeyWeakMap();

/**
 * @template T
 * @template R
 * @param {Selector<T, R>} getter getter for value
 * @param {Comparator<R>} comparator comparator
 * @returns {Comparator<T>} comparator
 */
exports.compareSelect = (getter, comparator) => {
	const cacheEntry = compareSelectCache.get(getter, comparator);
	if (cacheEntry !== undefined) return cacheEntry;
	/**
	 * @param {T} a first value
	 * @param {T} b second value
	 * @returns {-1|0|1} compare result
	 */
	const result = (a, b) => {
		const aValue = getter(a);
		const bValue = getter(b);
		if (aValue) {
			if (bValue) return comparator(aValue, bValue);
			return -1;
		} else {
			if (bValue) return 1;
			return 0;
		}
	};
	compareSelectCache.set(getter, comparator, result);
	return result;
};
