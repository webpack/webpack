/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const InnerGraph = require("./optimize/InnerGraph");

/** @typedef {import("./Compiler")} Compiler */

class FlagUsingEvalPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagUsingEvalPlugin",
			(compilation, { normalModuleFactory }) => {
				const handler = parser => {
					parser.hooks.call.for("eval").tap("FlagUsingEvalPlugin", () => {
						parser.state.module.buildInfo.moduleConcatenationBailout = "eval()";
						parser.state.module.buildInfo.usingEval = true;
						InnerGraph.bailout(parser.state);
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("FlagUsingEvalPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("FlagUsingEvalPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("FlagUsingEvalPlugin", handler);
			}
		);
	}
}

module.exports = FlagUsingEvalPlugin;
