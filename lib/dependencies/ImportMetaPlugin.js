/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const {
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const ImportMetaDependency = require("./ImportMetaDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} Parser */

class ImportMetaPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ImportMetaPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ImportMetaDependency,
					new ImportMetaDependency.Template()
				);
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
					parser.hooks.typeof
						.for("import.meta.url")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify("string"))
						);

					parser.hooks.metaProperty.tap("ImportMetaPlugin", expr => {
						parser.state.module.addPresentationalDependency(
							new ImportMetaDependency(expr.range)
						);
					});

					parser.hooks.expression
						.for("import.meta.url")
						.tap("ImportMetaPlugin", expr => {
							parser.state.module.addPresentationalDependency(
								new ImportMetaDependency(
									expr.range,
									ImportMetaDependency.ImportMetaProperty.Url
								)
							);
							return true;
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
