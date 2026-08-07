/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/**
 * Duck-type check for Promise-like values (same realm or not).
 * @param {unknown} value value that may be async
 * @returns {value is Promise<EXPECTED_ANY>} true when value is Promise-like
 */
const isPromise = (value) =>
	Boolean(value) &&
	typeof value === "object" &&
	typeof (/** @type {{ then?: unknown }} */ (value).then) === "function";

module.exports = isPromise;
