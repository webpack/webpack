/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

/** @type {Map<string, Function>} */
const deprecationCache = new Map();

/**
 * @param {string} message deprecation message
 * @returns {Function} function to trigger deprecation
 */
const createDeprecation = message => {
	const cached = deprecationCache.get(message);
	if (cached !== undefined) return cached;
	const fn = util.deprecate(() => {}, message);
	deprecationCache.set(message, fn);
	return fn;
};

const COPY_METHODS = [
	"concat",
	"entry",
	"filter",
	"find",
	"findIndex",
	"includes",
	"indexOf",
	"join",
	"lastIndexOf",
	"map",
	"reduce",
	"reduceRight",
	"slice",
	"some"
];

const DISABLED_METHODS = [
	"copyWithin",
	"entries",
	"fill",
	"keys",
	"pop",
	"reverse",
	"shift",
	"splice",
	"sort",
	"unshift"
];

/**
 * @param {any} set new set
 * @param {string} name property name
 * @returns {void}
 */
exports.arrayToSetDeprecation = (set, name) => {
	for (const method of COPY_METHODS) {
		if (set[method]) continue;
		const d = createDeprecation(
			`${name} was changed from Array to Set (using Array method '${method}' is deprecated)`
		);
		/**
		 * @deprecated
		 * @this {Set}
		 * @returns {number} count
		 */
		set[method] = function() {
			d();
			const array = Array.from(this);
			return Array.prototype[method].apply(array, arguments);
		};
	}
	const dPush = createDeprecation(
		`${name} was changed from Array to Set (using Array method 'push' is deprecated)`
	);
	/**
	 * @deprecated
	 * @this {Set}
	 * @returns {number} count
	 */
	set.push = function() {
		dPush();
		for (const item of Array.from(arguments)) {
			this.add(item);
		}
		return this.size;
	};
	for (const method of DISABLED_METHODS) {
		if (set[method]) continue;
		set[method] = () => {
			throw new Error(
				`${name} was changed from Array to Set (using Array method '${method}' is not possible)`
			);
		};
	}
	Object.defineProperty(set, "length", {
		get() {
			return set.size;
		},
		set(value) {
			throw new Error(
				`${name} was changed from Array to Set (writing to Array property 'length' is not possible)`
			);
		}
	});
};
