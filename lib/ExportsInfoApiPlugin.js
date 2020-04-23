/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const ExportsInfoDependency = require("./dependencies/ExportsInfoDependency");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

class ExportsInfoApiPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ExportsInfoApiPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ExportsInfoDependency,
					new ExportsInfoDependency.Template()
				);
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = parser => {
					parser.hooks.expressionMemberChain
						.for("__webpack_exports_info__")
						.tap("ExportsInfoApiPlugin", (expr, members) => {
							const dep =
								members.length >= 2
									? new ExportsInfoDependency(
											expr.range,
											members.slice(0, -1),
											members[members.length - 1]
									  )
									: new ExportsInfoDependency(expr.range, null, members[0]);
							dep.loc = expr.loc;
							parser.state.module.addDependency(dep);
							return true;
						});
					parser.hooks.expression
						.for("__webpack_exports_info__")
						.tap("ExportsInfoApiPlugin", expr => {
							const dep = new ConstDependency("true", expr.range);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ExportsInfoApiPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ExportsInfoApiPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ExportsInfoApiPlugin", handler);
			}
		);
	}
}

module.exports = ExportsInfoApiPlugin;
