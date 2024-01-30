/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareRuntime } = require("./runtime");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

/** @template T @typedef {function(T, T): -1|0|1} Comparator */
/** @template TArg @template T @typedef {function(TArg, T, T): -1|0|1} RawParameterizedComparator */
/** @template TArg @template T @typedef {function(TArg): Comparator<T>} ParameterizedComparator */

/**
 * @template T
 * @param {RawParameterizedComparator<any, T>} fn comparator with argument
 * @returns {ParameterizedComparator<any, T>} comparator
 */
const createCachedParameterizedComparator = fn => {
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
		const result = fn.bind(null, arg);
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
/** @type {ParameterizedComparator<ChunkGraph, Module>} */
exports.compareModulesById =
	createCachedParameterizedComparator(compareModulesById);

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
exports.compareNumbers = compareNumbers;

/**
 * @param {string} a string
 * @param {string} b string
 * @returns {-1|0|1} compare result
 */
const compareStringsNumeric = (a, b) => {
	const aLength = a.length;
	const bLength = b.length;

	let aChar = 0;
	let bChar = 0;

	let aIsDigit = false;
	let bIsDigit = false;
	let i = 0;
	let j = 0;
	while (i < aLength && j < bLength) {
		aChar = a.charCodeAt(i);
		bChar = b.charCodeAt(j);

		aIsDigit = aChar >= 48 && aChar <= 57;
		bIsDigit = bChar >= 48 && bChar <= 57;

		if (!aIsDigit && !bIsDigit) {
			if (aChar < bChar) return -1;
			if (aChar > bChar) return 1;
			i++;
			j++;
		} else if (aIsDigit && !bIsDigit) {
			// This segment of a is shorter than in b
			return 1;
		} else if (!aIsDigit && bIsDigit) {
			// This segment of b is shorter than in a
			return -1;
		} else {
			let aNumber = aChar - 48;
			let bNumber = bChar - 48;

			while (++i < aLength) {
				aChar = a.charCodeAt(i);
				if (aChar < 48 || aChar > 57) break;
				aNumber = aNumber * 10 + aChar - 48;
			}

			while (++j < bLength) {
				bChar = b.charCodeAt(j);
				if (bChar < 48 || bChar > 57) break;
				bNumber = bNumber * 10 + bChar - 48;
			}

			if (aNumber < bNumber) return -1;
			if (aNumber > bNumber) return 1;
		}
	}

	if (j < bLength) {
		// a is shorter than b
		bChar = b.charCodeAt(j);
		bIsDigit = bChar >= 48 && bChar <= 57;
		return bIsDigit ? -1 : 1;
	}
	if (i < aLength) {
		// b is shorter than a
		aChar = a.charCodeAt(i);
		aIsDigit = aChar >= 48 && aChar <= 57;
		return aIsDigit ? 1 : -1;
	}

	return 0;
};
exports.compareStringsNumeric = compareStringsNumeric;

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByPostOrderIndexOrIdentifier = (moduleGraph, a, b) => {
	const cmp = compareNumbers(
		moduleGraph.getPostOrderIndex(a),
		moduleGraph.getPostOrderIndex(b)
	);
	if (cmp !== 0) return cmp;
	return compareIds(a.identifier(), b.identifier());
};
/** @type {ParameterizedComparator<ModuleGraph, Module>} */
exports.compareModulesByPostOrderIndexOrIdentifier =
	createCachedParameterizedComparator(
		compareModulesByPostOrderIndexOrIdentifier
	);

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByPreOrderIndexOrIdentifier = (moduleGraph, a, b) => {
	const cmp = compareNumbers(
		moduleGraph.getPreOrderIndex(a),
		moduleGraph.getPreOrderIndex(b)
	);
	if (cmp !== 0) return cmp;
	return compareIds(a.identifier(), b.identifier());
};
/** @type {ParameterizedComparator<ModuleGraph, Module>} */
exports.compareModulesByPreOrderIndexOrIdentifier =
	createCachedParameterizedComparator(
		compareModulesByPreOrderIndexOrIdentifier
	);

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesByIdOrIdentifier = (chunkGraph, a, b) => {
	const cmp = compareIds(chunkGraph.getModuleId(a), chunkGraph.getModuleId(b));
	if (cmp !== 0) return cmp;
	return compareIds(a.identifier(), b.identifier());
};
/** @type {ParameterizedComparator<ChunkGraph, Module>} */
exports.compareModulesByIdOrIdentifier = createCachedParameterizedComparator(
	compareModulesByIdOrIdentifier
);

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Chunk} a chunk
 * @param {Chunk} b chunk
 * @returns {-1|0|1} compare result
 */
const compareChunks = (chunkGraph, a, b) => {
	return chunkGraph.compareChunks(a, b);
};
/** @type {ParameterizedComparator<ChunkGraph, Chunk>} */
exports.compareChunks = createCachedParameterizedComparator(compareChunks);

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
 * @param {string} a first string
 * @param {string} b second string
 * @returns {-1|0|1} compare result
 */
const compareStrings = (a, b) => {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};

exports.compareStrings = compareStrings;

/**
 * @param {ChunkGroup} a first chunk group
 * @param {ChunkGroup} b second chunk group
 * @returns {-1|0|1} compare result
 */
const compareChunkGroupsByIndex = (a, b) => {
	return a.index < b.index ? -1 : 1;
};

exports.compareChunkGroupsByIndex = compareChunkGroupsByIndex;

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
 * @param {Comparator<T>[]} cRest comparators
 * @returns {Comparator<T>} comparator
 */
const concatComparators = (c1, c2, ...cRest) => {
	if (cRest.length > 0) {
		const [c3, ...cRest2] = cRest;
		return concatComparators(c1, concatComparators(c2, c3, ...cRest2));
	}
	const cacheEntry = /** @type {Comparator<T>} */ (
		concatComparatorsCache.get(c1, c2)
	);
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
exports.concatComparators = concatComparators;

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
const compareSelect = (getter, comparator) => {
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
		if (aValue !== undefined && aValue !== null) {
			if (bValue !== undefined && bValue !== null) {
				return comparator(aValue, bValue);
			}
			return -1;
		} else {
			if (bValue !== undefined && bValue !== null) {
				return 1;
			}
			return 0;
		}
	};
	compareSelectCache.set(getter, comparator, result);
	return result;
};
exports.compareSelect = compareSelect;

/** @type {WeakMap<Comparator<any>, Comparator<Iterable<any>>>} */
const compareIteratorsCache = new WeakMap();

/**
 * @template T
 * @param {Comparator<T>} elementComparator comparator for elements
 * @returns {Comparator<Iterable<T>>} comparator for iterables of elements
 */
const compareIterables = elementComparator => {
	const cacheEntry = compareIteratorsCache.get(elementComparator);
	if (cacheEntry !== undefined) return cacheEntry;
	/**
	 * @param {Iterable<T>} a first value
	 * @param {Iterable<T>} b second value
	 * @returns {-1|0|1} compare result
	 */
	const result = (a, b) => {
		const aI = a[Symbol.iterator]();
		const bI = b[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = aI.next();
			const bItem = bI.next();
			if (aItem.done) {
				return bItem.done ? 0 : -1;
			} else if (bItem.done) {
				return 1;
			}
			const res = elementComparator(aItem.value, bItem.value);
			if (res !== 0) return res;
		}
	};
	compareIteratorsCache.set(elementComparator, result);
	return result;
};
exports.compareIterables = compareIterables;

// TODO this is no longer needed when minimum node.js version is >= 12
// since these versions ship with a stable sort function
/**
 * @template T
 * @param {Iterable<T>} iterable original ordered list
 * @returns {Comparator<T>} comparator
 */
exports.keepOriginalOrder = iterable => {
	/** @type {Map<T, number>} */
	const map = new Map();
	let i = 0;
	for (const item of iterable) {
		map.set(item, i++);
	}
	return (a, b) => compareNumbers(map.get(a), map.get(b));
};

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {Comparator<Chunk>} comparator
 */
exports.compareChunksNatural = chunkGraph => {
	const cmpFn = exports.compareModulesById(chunkGraph);
	const cmpIterableFn = compareIterables(cmpFn);
	return concatComparators(
		compareSelect(chunk => chunk.name, compareIds),
		compareSelect(chunk => chunk.runtime, compareRuntime),
		compareSelect(
			/**
			 * @param {Chunk} chunk a chunk
			 * @returns {Iterable<Module>} modules
			 */
			chunk => chunkGraph.getOrderedChunkModulesIterable(chunk, cmpFn),
			cmpIterableFn
		)
	);
};

/**
 * Compare two locations
 * @param {DependencyLocation} a A location node
 * @param {DependencyLocation} b A location node
 * @returns {-1|0|1} sorting comparator value
 */
exports.compareLocations = (a, b) => {
	let isObjectA = typeof a === "object" && a !== null;
	let isObjectB = typeof b === "object" && b !== null;
	if (!isObjectA || !isObjectB) {
		if (isObjectA) return 1;
		if (isObjectB) return -1;
		return 0;
	}
	if ("start" in a) {
		if ("start" in b) {
			const ap = a.start;
			const bp = b.start;
			if (ap.line < bp.line) return -1;
			if (ap.line > bp.line) return 1;
			if (ap.column < bp.column) return -1;
			if (ap.column > bp.column) return 1;
		} else return -1;
	} else if ("start" in b) return 1;
	if ("name" in a) {
		if ("name" in b) {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
		} else return -1;
	} else if ("name" in b) return 1;
	if ("index" in a) {
		if ("index" in b) {
			if (a.index < b.index) return -1;
			if (a.index > b.index) return 1;
		} else return -1;
	} else if ("index" in b) return 1;
	return 0;
};
