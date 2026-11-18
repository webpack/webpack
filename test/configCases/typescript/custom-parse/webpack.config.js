"use strict";

const acorn = require("acorn");

/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../../lib/javascript/JavascriptParser"
 */

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	module: {
		parser: {
			javascript: {
				/**
				 * A parser of JavaScript alone, which is handed the source with its
				 * types blanked.
				 * @param {string} code source code
				 * @param {ParseOptions} options parse options
				 * @returns {ParseResult} parse result
				 */
				parse: (code, options) => ({
					ast: /** @type {ParseResult["ast"]} */ (
						acorn.parse(code, {
							sourceType: options.sourceType,
							ecmaVersion: "latest",
							ranges: true
						})
					),
					comments: []
				})
			}
		}
	}
};
