/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */

class FlagUsingEvalPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagUsingEvalPlugin",
			(compilation, { normalModuleFactory }) => {
				const handler = parser => {
					parser.hooks.call.for("eval").tap("FlagUsingEvalPlugin", () => {
						parser.state.module.buildMeta.moduleConcatenationBailout = "eval()";
						parser.state.module.buildMeta.usingEval = true;
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
