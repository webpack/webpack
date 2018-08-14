/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module")} Module */

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
exports.compareModulesById = (a, b) => {
	return compareIds(a.id, b.id);
};

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
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
exports.compareModulesByIndex = (a, b) => {
	return compareNumbers(a.index, b.index);
};

/**
 * @param {Module} a module
 * @param {Module} b module
 * @returns {-1|0|1} compare result
 */
exports.compareModulesByIndex2 = (a, b) => {
	return compareNumbers(a.index2, b.index2);
};

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
