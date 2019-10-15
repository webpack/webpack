/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @template T @typedef {function(): T} FunctionReturning */

/**
 * @template T
 * @param {FunctionReturning<T>} fn memorized function
 * @returns {FunctionReturning<T>} new function
 */
const memorize = fn => {
	let memorized = false;
	/** @type {T} */
	let result = undefined;
	return () => {
		if (memorized) {
			return result;
		} else {
			result = fn();
			memorized = true;
			// Allow to clean up memory for fn
			// and all dependent resources
			fn = undefined;
			return result;
		}
	};
};

module.exports = memorize;
