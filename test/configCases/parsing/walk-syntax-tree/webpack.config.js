"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @import JavascriptParser from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "walk-syntax-tree";

/**
 * Parses every JavaScript module into the syntax tree and walks its lazy objects.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const walkSyntaxTree = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			let walked = 0;
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (moduleParser) => {
					const parser = /** @type {JavascriptParser} */ (moduleParser);
					parser._walkTree = true;
					/**
					 * @param {import("estree").CallExpression} expression the call
					 * @returns {boolean} whether its first argument is pure
					 */
					const firstArgumentIsPure = (expression) => {
						const argument = /** @type {import("estree").Expression} */ (
							expression.arguments[0]
						);
						return parser.isPure(
							argument,
							/** @type {[number, number]} */ (expression.range)[0]
						);
					};
					parser.hooks.call.for("innerPure").tap(PLUGIN_NAME, (expression) => {
						expect(firstArgumentIsPure(expression)).toBe(true);
						return true;
					});
					parser.hooks.call
						.for("nestedParse")
						.tap(PLUGIN_NAME, (expression) => {
							expect(firstArgumentIsPure(expression)).toBe(true);
							// the nested parse reads purity in its own tree, released after
							parser.parse("innerPure(/*#__PURE__*/ other());", parser.state);
							expect(firstArgumentIsPure(expression)).toBe(true);
							return true;
						});
					parser.hooks.finish.tap(PLUGIN_NAME, (ast) => {
						// a lazy object builds its children on first read, off its own keys
						expect(Object.keys(ast)).not.toContain("body");
						expect(ast.body.length).toBeGreaterThan(0);
						walked++;
					});
				});
			compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
				// a build restored from the cache parses nothing
				if (walked === 0) return;
				// eleven modules and the parse nested in one of them
				expect(walked).toBe(12);
				for (const module of modules) {
					if (module.identifier().endsWith("destructure.js")) {
						/** @type {string[]} */
						const names = [];
						for (const dependency of module.dependencies) {
							const properties =
								/** @type {{ referencedPropertiesInDestructuring?: Set<{ id: string }> }} */
								(dependency).referencedPropertiesInDestructuring;
							if (properties) for (const { id } of properties) names.push(id);
							const exports =
								/** @type {{ referencedExports?: string[][] | null }} */
								(dependency).referencedExports;
							if (exports) for (const [id] of exports) names.push(id);
						}
						// the names each destructuring reads, recorded by id
						expect(names.sort()).toEqual(
							[
								"double",
								"value",
								"extra",
								"lit",
								"0",
								"value",
								"value",
								"value",
								"value"
							].sort()
						);
					}
					if (!module.identifier().endsWith("literal.js")) continue;
					// `module.exports = { … }` read as the module's named exports
					expect(module.buildMeta && module.buildMeta.exportsType).toBe(
						"default"
					);
				}
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [walkSyntaxTree]
};
