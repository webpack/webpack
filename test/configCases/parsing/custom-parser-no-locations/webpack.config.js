"use strict";

const acorn = require("acorn");

/** @typedef {import("../../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				/**
				 * A parser without location support — nodes carry only offsets.
				 * @param {string} code source code
				 * @param {ParseOptions} options parse options
				 * @returns {ParseResult} parse result
				 */
				parse: (code, options) => {
					/** @type {ParseResult["comments"]} */
					const comments = [];
					/** @type {Set<number>} */
					const semicolons = new Set();
					const ast = acorn.parse(code, {
						sourceType: options.sourceType,
						ecmaVersion: "latest",
						locations: false,
						ranges: true,
						allowHashBang: true,
						allowReturnOutsideFunction: options.allowReturnOutsideFunction,
						onComment: /** @type {EXPECTED_ANY} */ (comments),
						onInsertedSemicolon: (pos) => semicolons.add(pos)
					});
					return {
						ast: /** @type {ParseResult["ast"]} */ (ast),
						comments,
						semicolons
					};
				}
			}
		}
	}
};
