"use strict";

const acorn = require("acorn");
const webpack = require("../../../../");

/**
 * Parses with acorn, then drops what a parser of the caller's own may not report.
 * @param {boolean} dropRaw whether string literals lose their raw text too
 * @returns {(code: string, options: import("acorn").Options) => { ast: import("acorn").Program, comments: import("acorn").Comment[] }} a `parse` option
 */
const parseWithoutDirectives = (dropRaw) => (code, options) => {
	/** @type {import("acorn").Comment[]} */
	const comments = [];
	const ast = acorn.parse(code, { ...options, onComment: comments });
	/**
	 * @param {EXPECTED_ANY} node a node of the tree
	 */
	const strip = (node) => {
		if (!node || typeof node.type !== "string") return;
		if (node.type === "ExpressionStatement") {
			node.directive = undefined;
			if (dropRaw && node.expression.type === "Literal") {
				node.expression.raw = undefined;
			}
		}
		for (const key of Object.keys(node)) {
			const value = node[key];
			if (Array.isArray(value)) {
				for (const child of value) strip(child);
			} else if (value && typeof value.type === "string") {
				strip(value);
			}
		}
	};
	strip(ast);
	return { ast, comments };
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			// the raw text still tells an escaped spelling apart
			{
				resourceQuery: /^\?ast$/,
				type: "javascript/dynamic",
				parser: { parse: parseWithoutDirectives(false) }
			},
			// only the value is left to read
			{
				resourceQuery: /^\?ast-no-raw$/,
				type: "javascript/dynamic",
				parser: { parse: parseWithoutDirectives(true) }
			}
		]
	},
	plugins: [
		new webpack.ProvidePlugin({
			provided: [require.resolve("./provided"), "value"]
		})
	],
	optimization: {
		minimize: false
	}
};
