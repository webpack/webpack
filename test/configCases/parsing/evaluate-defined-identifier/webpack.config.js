"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @import JavascriptParser from "../../../../lib/javascript/JavascriptParser" */

const BasicEvaluatedExpression = require("../../../../lib/javascript/BasicEvaluatedExpression");

const PLUGIN_NAME = "evaluate-defined-identifier";

/**
 * Evaluates the defined `flag` binding to `false` through its hook.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const evaluateDefinedFlag = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (moduleParser) => {
					const parser = /** @type {JavascriptParser} */ (moduleParser);
					parser.hooks.evaluateDefinedIdentifier
						.for("flag")
						.tap(PLUGIN_NAME, (expression) =>
							new BasicEvaluatedExpression()
								.setBoolean(false)
								.setRange(/** @type {[number, number]} */ (expression.range))
						);
				});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		innerGraph: true,
		minimize: false,
		concatenateModules: false
	},
	plugins: [evaluateDefinedFlag]
};
