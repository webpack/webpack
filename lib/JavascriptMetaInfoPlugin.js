/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const InnerGraph = require("./optimize/InnerGraph");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

class JavascriptMetaInfoPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptMetaInfoPlugin",
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = parser => {
					parser.hooks.call.for("eval").tap("JavascriptMetaInfoPlugin", () => {
						parser.state.module.buildInfo.moduleConcatenationBailout = "eval()";
						parser.state.module.buildInfo.usingEval = true;
						InnerGraph.bailout(parser.state);
					});
					parser.hooks.finish.tap("JavascriptMetaInfoPlugin", () => {
						let topLevelDeclarations =
							parser.state.module.buildInfo.topLevelDeclarations;
						if (topLevelDeclarations === undefined) {
							topLevelDeclarations =
								parser.state.module.buildInfo.topLevelDeclarations = new Set();
						}
						for (const name of parser.scope.definitions.asSet()) {
							const freeInfo = parser.getFreeInfoFromVariable(name);
							if (freeInfo === undefined) {
								topLevelDeclarations.add(name);
							}
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("JavascriptMetaInfoPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("JavascriptMetaInfoPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("JavascriptMetaInfoPlugin", handler);
			}
		);
	}
}

module.exports = JavascriptMetaInfoPlugin;
