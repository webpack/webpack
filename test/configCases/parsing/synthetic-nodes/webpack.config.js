"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @import JavascriptParser from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "synthetic-nodes";

/**
 * @param {string} name the name
 * @param {[number, number]} range where the node stands in its module
 * @returns {import("estree").Identifier} an identifier no parser made
 */
const identifier = (name, range) => ({
	type: "Identifier",
	name,
	range
});

/**
 * @param {string | number} value the value
 * @param {[number, number]} range where the node stands in its module
 * @returns {import("estree").Literal} a literal no parser made
 */
const literal = (value, range) => ({
	type: "Literal",
	value,
	raw: JSON.stringify(value),
	range
});

/**
 * Hands the parser nodes no parser built, during a parse and after one.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const syntheticNodes = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			/** @type {Record<string, unknown>} */
			const seen = { walked: [], entered: [] };
			let parsed = 0;
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (moduleParser) => {
					const parser = /** @type {JavascriptParser} */ (moduleParser);
					parser.hooks.expression
						.for("syntheticName")
						.tap(PLUGIN_NAME, (expression) => {
							/** @type {string[]} */ (seen.walked).push(
								/** @type {import("estree").Identifier} */ (expression).name
							);
							return true;
						});
					parser.hooks.call.for("probe").tap(PLUGIN_NAME, (expression) => {
						const range = /** @type {[number, number]} */ (expression.range);
						seen.evaluated = parser
							.evaluateExpression({
								type: "BinaryExpression",
								operator: "+",
								left: literal(1, range),
								right: literal(2, range),
								range
							})
							.asCompileTimeValue();
						seen.pure = parser.isPure(literal("x", range), range[0]);
						parser.walkExpression(identifier("syntheticName", range));
						parser.enterPattern(
							{
								type: "ArrayPattern",
								elements: [identifier("a", range), identifier("b", range)],
								range
							},
							(name, ident) => {
								expect(ident.type).toBe("Identifier");
								/** @type {string[]} */ (seen.entered).push(name);
							}
						);
						return false;
					});
					parser.hooks.finish.tap(PLUGIN_NAME, () => {
						parsed++;
						if (seen.outsideEvaluated !== undefined) return;
						// after the parse, with no tree to read: each gets one of its own
						process.nextTick(() => {
							seen.outsideEvaluated = parser
								.evaluateExpression({
									type: "BinaryExpression",
									operator: "+",
									left: literal("ab", [0, 4]),
									right: literal("c", [5, 8]),
									range: [0, 8]
								})
								.asString();
						});
					});
				});
			compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
				for (const name of Object.keys(compilation.assets)) {
					const source = compilation.assets[name].source().toString();
					compilation.assets[name] = new compiler.webpack.sources.RawSource(
						// a build restored from the cache parses nothing
						source.replace(
							"__SYNTHETIC__",
							parsed === 0 ? "null" : JSON.stringify(seen)
						)
					);
				}
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [syntheticNodes]
};
