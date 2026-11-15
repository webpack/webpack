"use strict";

const acorn = require("acorn");

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @import JavascriptParser from "../../../../lib/javascript/JavascriptParser" */
/** @import { ParseOptions, ParseResult } from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "custom-parser-original-nodes";

/** @type {WeakSet<import("estree").Node>} */
const built = new WeakSet();

/**
 * Tags every node of an ESTree subtree and remembers it as the parser's own.
 * @param {unknown} value a node, a list or a value
 * @returns {void}
 */
const tag = (value) => {
	if (Array.isArray(value)) {
		for (const item of value) tag(item);
		return;
	}
	if (value === null || typeof value !== "object") return;
	const node = /** @type {Record<string, unknown>} */ (value);
	if (typeof node.type !== "string") return;
	node.webpackTag = "tagged";
	built.add(/** @type {import("estree").Node} */ (value));
	for (const key of Object.keys(node)) tag(node[key]);
};

/**
 * Checks that hooks without `path` read the custom parser's objects.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const originalNodes = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			let parsed = 0;
			let probed = 0;
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (moduleParser) => {
					const parser = /** @type {JavascriptParser} */ (moduleParser);
					parser.hooks.call.for("probe").tap(PLUGIN_NAME, (expression) => {
						probed++;
						const call = /** @type {import("estree").CallExpression} */ (
							expression
						);
						// the custom parser's object, its own fields and identity kept
						expect(built.has(call)).toBe(true);
						expect(
							/** @type {{ webpackTag?: string }} */ (call).webpackTag
						).toBe("tagged");
						const argument = /** @type {import("estree").Expression} */ (
							call.arguments[0]
						);
						expect(built.has(argument)).toBe(true);
						// handed back, it is read as its own node, not written again
						parser.walkExpression(argument);
						expect(parser.evaluateExpression(argument).expression).toBe(
							argument
						);
						expect(
							/** @type {{ _appendedNodes?: WeakMap<import("estree").Node, number> }} */ (
								/** @type {unknown} */ (parser)
							)._appendedNodes
						).toBeUndefined();
						return false;
					});
					parser.hooks.finish.tap(PLUGIN_NAME, () => {
						parsed++;
					});
				});
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				// a build restored from the cache parses nothing
				if (parsed === 0) return;
				expect(probed).toBe(1);
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /index\.js$/,
				parser: {
					/**
					 * Parses with acorn and tags every node it built.
					 * @param {string} code source code
					 * @param {ParseOptions} options parse options
					 * @returns {ParseResult} parse result
					 */
					parse: (code, options) => {
						const ast = acorn.parse(code, {
							sourceType: options.sourceType,
							ecmaVersion: "latest",
							ranges: true
						});
						tag(ast);
						return {
							ast: /** @type {ParseResult["ast"]} */ (ast),
							comments: []
						};
					}
				}
			}
		]
	},
	plugins: [originalNodes]
};
