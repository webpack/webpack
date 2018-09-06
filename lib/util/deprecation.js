/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

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
		set[method] = util.deprecate(
			/**
			 * @template T
			 * @this {Set}
			 * @returns {any} something
			 */
			function() {
				const array = Array.from(this);
				return Array.prototype[method].apply(array, arguments);
			},
			`${name} was changed from Array to Set (using Array methods is deprecated)`
		);
	}
	set.push = util.deprecate(
		/**
		 * @deprecated
		 * @this {Set}
		 * @returns {number} count
		 */
		function() {
			for (const item of Array.from(arguments)) {
				this.add(item);
			}
			return this.size;
		},
		`${name} was changed from Array to Set (using Array methods is deprecated)`
	);
	for (const method of DISABLED_METHODS) {
		if (set[method]) continue;
		set[method] = () => {
			throw new Error(
				`${name} was changed from Array to Set (using Array methods is deprecated)`
			);
		};
	}
	Object.defineProperty(set, "length", {
		get() {
			return set.size;
		},
		set(value) {
			throw new Error(
				`${name} was changed from Array to Set (using Array methods is deprecated)`
			);
		}
	});
};
