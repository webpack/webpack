"use strict";

// What `schema-utils precompile` makes of `loader.options.json`, written by hand
/**
 * @param {EXPECTED_ANY} options options
 * @returns {boolean} whether the options are valid
 */
module.exports = (options) =>
	Object.keys(options).every((key) => key === "name") &&
	(options.name === undefined || typeof options.name === "string");
