/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const IgnoreErrorModuleFactory = require("./IgnoreErrorModuleFactory");
const WebpackIsIncludedDependency = require("./dependencies/WebpackIsIncludedDependency");
const {
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

class WebpackIsIncludedPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"WebpackIsIncludedPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WebpackIsIncludedDependency,
					new IgnoreErrorModuleFactory(normalModuleFactory)
				);
				compilation.dependencyTemplates.set(
					WebpackIsIncludedDependency,
					new WebpackIsIncludedDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = parser => {
					parser.hooks.call
						.for("__webpack_is_included__")
						.tap("WebpackIsIncludedPlugin", expr => {
							if (
								expr.type !== "CallExpression" ||
								expr.arguments.length !== 1 ||
								expr.arguments[0].type === "SpreadElement"
							)
								return;

							const request = parser.evaluateExpression(expr.arguments[0]);

							if (!request.isString()) return;

							const dep = new WebpackIsIncludedDependency(
								request.string,
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addDependency(dep);
							return true;
						});
					parser.hooks.typeof
						.for("__webpack_is_included__")
						.tap(
							"WebpackIsIncludedPlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("WebpackIsIncludedPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("WebpackIsIncludedPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("WebpackIsIncludedPlugin", handler);
			}
		);
	}
}

module.exports = WebpackIsIncludedPlugin;
