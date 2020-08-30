/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const {
	approve,
	parseMetaProperty
} = require("../javascript/JavascriptParserHelpers");
const URLDependency = require("./URLDependency");

/** @typedef {import("estree").NewExpression} NewExpressionNode */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

class URLPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"URLPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(URLDependency, normalModuleFactory);
				compilation.dependencyTemplates.set(
					URLDependency,
					new URLDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser parser
				 */
				const parserCallback = parser => {
					const parseImportMetaUrl = parseMetaProperty(
						parser,
						"import.meta.url"
					);
					parser.hooks.canRename.for("URL").tap("URLPlugin", approve);
					parser.hooks.new.for("URL").tap("URLPlugin", _expr => {
						const expr = /** @type {NewExpressionNode} */ (_expr);

						if (expr.arguments.length !== 2) return;

						const [arg1, arg2] = expr.arguments;

						if (
							arg1.type === "SpreadElement" ||
							parseImportMetaUrl(arg2) === undefined
						)
							return;

						const request = parser.evaluateExpression(arg1).asString();

						if (!request) return;

						const dep = new URLDependency(request, [
							arg1.range[0],
							arg2.range[1]
						]);
						dep.loc = expr.loc;
						parser.state.module.addDependency(dep);
						return true;
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("URLPlugin", parserCallback);

				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("URLPlugin", parserCallback);
			}
		);
	}
}

module.exports = URLPlugin;
