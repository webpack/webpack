/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
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
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
const compareModulesById = (moduleGraph, a, b) => {
	return compareIds(a.id, b.id);
};
/** @type {ParamizedComparator<ModuleGraph, Module>} */
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
	return compareNumbers(a.index, b.index);
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
	return compareNumbers(a.index2, b.index2);
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
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;
	const identA = a.identifier();
	const identB = b.identifier();
	if (identA < identB) return -1;
	if (identA > identB) return 1;
	return 0;
};
/** @type {ParamizedComparator<ModuleGraph, Module>} */
exports.compareModulesByIndexOrIdentifier = createCachedParamizedComparator(
	compareModulesByIndexOrIdentifier
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
