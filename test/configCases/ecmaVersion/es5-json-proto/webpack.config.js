"use strict";

/**
 * @param {boolean} JSONParse use JSON.parse for large JSON
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (JSONParse) => ({
	name: JSONParse ? "json-parse" : "no-json-parse",
	target: ["web", "es5"],
	mode: "production",
	output: {
		filename: `${JSONParse ? "json-parse" : "no-json-parse"}.js`
	},
	module: {
		generator: {
			json: { JSONParse }
		}
	},
	optimization: {
		minimize: false,
		mangleExports: false
	}
});

// An own `__proto__` key in an object literal needs a computed key, which an
// es5 target cannot parse.
/** @type {import("../../../../").Configuration[]} */
module.exports = [variant(false), variant(true)];
