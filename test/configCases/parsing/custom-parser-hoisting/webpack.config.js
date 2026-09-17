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
	module: {
		rules: [
			{
				// sloppy-mode script, which is what `with` needs
				test: /hoisting\.js$/,
				type: "javascript/dynamic"
			}
		],
		parser: {
			javascript: {
				/**
				 * A parser of the caller's own: its AST carries no record of what
				 * each scope declares, so webpack collects one for it.
				 * @param {string} code source code
				 * @param {ParseOptions} options parse options
				 * @returns {ParseResult} parse result
				 */
				parse: (code, options) => {
					/** @type {ParseResult["comments"]} */
					const comments = [];
					const ast = acorn.parse(code, {
						sourceType: options.sourceType,
						ecmaVersion: "latest",
						ranges: true,
						allowHashBang: true,
						allowReturnOutsideFunction: options.allowReturnOutsideFunction,
						onComment: /** @type {EXPECTED_ANY} */ (comments)
					});
					return {
						ast: /** @type {ParseResult["ast"]} */ (ast),
						comments
					};
				}
			}
		}
	}
};
