"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */

const PLUGIN_NAME = "block-pre-statement-path";

/**
 * Taps `blockPreStatement`, which has every block pre-walked statement by
 * statement, the id walk's included.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const blockPreStatement = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (parser) => {
					parser.hooks.blockPreStatement.tap(PLUGIN_NAME, () => {});
				});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [blockPreStatement]
};
