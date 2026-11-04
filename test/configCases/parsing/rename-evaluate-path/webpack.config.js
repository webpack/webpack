"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */

const PLUGIN_NAME = "rename-evaluate-path";

/**
 * Taps the `evaluate` hooks for identifiers and literals, and
 * `evaluateIdentifier` for a member chain, so renaming evaluates them.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const evaluateTaps = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (parser) => {
					parser.hooks.evaluate.for("Identifier").tap(PLUGIN_NAME, () => {});
					parser.hooks.evaluate.for("Literal").tap(PLUGIN_NAME, () => {});
					parser.hooks.evaluateIdentifier
						.for("custom.member")
						.tap(PLUGIN_NAME, () => {});
				});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [evaluateTaps]
};
