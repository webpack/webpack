"use strict";

const acorn = require("acorn");
const webpack = require("../../../../");

/**
 * @import {
 * 	ParseOptions,
 * 	ParseResult
 * } from "../../../../lib/javascript/JavascriptParser"
 */

/**
 * Drops the optional directive metadata, as a parser that reports a directive
 * as a plain expression statement does.
 * @param {EXPECTED_ANY} node node to strip
 * @returns {void}
 */
const stripDirectives = (node) => {
	if (Array.isArray(node)) {
		for (const item of node) stripDirectives(item);
		return;
	}
	if (node === null || typeof node !== "object") return;
	if (node.type === "ExpressionStatement") node.directive = undefined;
	for (const key of Object.keys(node)) stripDirectives(node[key]);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.ProvidePlugin({
			provided: [require.resolve("./provided"), "value"]
		})
	],
	module: {
		parser: {
			javascript: {
				/**
				 * A parser whose AST states no directive, so webpack reads the
				 * spelling out of the literal itself.
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
						locations: false,
						ranges: true,
						allowHashBang: true,
						allowReturnOutsideFunction: options.allowReturnOutsideFunction,
						onComment: /** @type {EXPECTED_ANY} */ (comments)
					});
					stripDirectives(ast);
					return {
						ast: /** @type {ParseResult["ast"]} */ (ast),
						comments
					};
				}
			}
		}
	},
	optimization: {
		minimize: false
	}
};
