/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

let interception;

const originalDeprecate = util.deprecate;

/**
 * @template {EXPECTED_FUNCTION} T
 * @param {T} fn fn
 * @param {string} message message
 * @param {string=} code code
 * @returns {T} result
 */
util.deprecate = (fn, message, code) => {
	const original = originalDeprecate(fn, message, code);

	// @ts-expect-error expected
	return function (...args) {
		if (interception) {
			interception.set(`${code}: ${message}`, {
				code,
				message,
				stack: new Error(message).stack
			});
			// @ts-expect-error expected
			return fn.apply(this, args);
		}

		// @ts-expect-error expected
		return original.apply(this, args);
	};
};

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
