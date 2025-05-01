/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

/** @type {undefined | Map<string, { code: string, message: string, stack: string }>} */
let interception;

const originalDeprecate = util.deprecate;

/**
 * @template {EXPECTED_FUNCTION} T
 * @param {T} fn fn
 * @param {string} message message
 * @param {string=} _code code
 * @returns {T} result
 */
util.deprecate = (fn, message, _code) => {
	const original = originalDeprecate(fn, message, _code);

	// @ts-expect-error expected
	return function (...args) {
		if (interception) {
			interception.set(`${_code}: ${message}`, {
				code: /** @type {string} */ (_code),
				message,
				stack: /** @type {string} */ (new Error(message).stack)
			});
			// @ts-expect-error expected
			return fn.apply(this, args);
		}

		// @ts-expect-error expected
		return original.apply(this, args);
	};
};

/**
 * @param {EXPECTED_ANY} handler handler
 * @returns {() => EXPECTED_ANY} result
 */
module.exports.start = handler => {
	interception = new Map();

	return () => {
		const map = interception;
		interception = undefined;
		return Array.from(map || [])
			.sort(([a], [b]) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			})
			.map(([key, data]) => data);
	};
};
