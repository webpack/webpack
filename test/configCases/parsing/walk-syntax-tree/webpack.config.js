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
					parser.hooks.finish.tap(PLUGIN_NAME, (ast) => {
						// a lazy object builds its children on first read, off its own keys
						expect(Object.keys(ast)).not.toContain("body");
						expect(ast.body.length).toBeGreaterThan(0);
						walked++;
					});
				});
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				// a build restored from the cache parses nothing
				if (walked === 0) return;
				expect(walked).toBe(5);
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [walkSyntaxTree]
};
