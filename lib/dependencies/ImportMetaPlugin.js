/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const {
	evaluateToIdentifier,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const ConstDependency = require("./ConstDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} Parser */

class ImportMetaPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ImportMetaPlugin",
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {NormalModule} module module
				 * @returns {string|undefined} file url
				 */
				const getUrl = module => {
					return pathToFileURL(module.resource).toString();
				};
				/**
				 * @param {Parser} parser parser
				 * @param {Object} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserHandler = (parser, parserOptions) => {
					parser.hooks.typeof
						.for("import.meta")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.metaProperty.tap(
						"ImportMetaPlugin",
						(metaProperty, end) => {
							if (end !== undefined && end !== metaProperty.range[1]) {
								const dep = new ConstDependency("undefined", [
									metaProperty.range[0],
									end
								]);
								dep.loc = metaProperty.loc;
								return parser.state.module.addPresentationalDependency(dep);
							}
							parser.state.module.addWarning(
								new CriticalDependencyWarning(
									"Direct accessing import.meta is disallowed"
								)
							);
							const dep = new ConstDependency("({})", metaProperty.range);
							dep.loc = metaProperty.loc;
							parser.state.module.addPresentationalDependency(dep);
						}
					);
					parser.hooks.evaluateIdentifier.for("import.meta").tap(
						"ImportMetaPlugin",
						evaluateToIdentifier(
							"import.meta",
							"import.meta",
							() => ["url"],
							true
						)
					);

					parser.hooks.typeof
						.for("import.meta.url")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify("string"))
						);
					parser.hooks.expression
						.for("import.meta.url")
						.tap("ImportMetaPlugin", expr => {
							const dep = new ConstDependency(
								JSON.stringify(getUrl(parser.state.module)),
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateIdentifier
						.for("import.meta.url")
						.tap("ImportMetaPlugin", expr => {
							return new BasicEvaluatedExpression()
								.setString(getUrl(parser.state.module))
								.setRange(expr.range);
						});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ImportMetaPlugin", parserHandler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ImportMetaPlugin", parserHandler);
			}
		);
	}
}

module.exports = ImportMetaPlugin;
