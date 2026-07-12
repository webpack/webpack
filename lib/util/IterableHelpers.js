/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * Returns last item.
 * @template T
 * @param {Iterable<T>} set a set
 * @returns {T | undefined} last item
 */
const last = (set) => {
	/** @type {T | undefined} */
	let last;
	for (const item of set) last = item;
	return last;
};

/**
 * Returns count of items.
 * @template T
 * @param {Iterable<T>} iterable an iterable
 * @returns {number} count of items
 */
const countIterable = (iterable) => {
	let i = 0;
	for (const _ of iterable) i++;
	return i;
};

module.exports.countIterable = countIterable;
module.exports.last = last;
