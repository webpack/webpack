/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const {
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const ConstDependency = require("./ConstDependency");

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").Identifier} Identifier */

const PLUGIN_NAME = "ImportMetaEnvPlugin";
class ImportMetaEnvPlugin {
	/**
	 * @param {Record<string, EXPECTED_ANY>} definitions environment variable definitions
	 */
	constructor(definitions = {}) {
		this.definitions = definitions;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const importMetaName = compilation.outputOptions.importMetaName;
				const fullImportMetaName = `${importMetaName}.env`;

				/**
				 * @param {JavascriptParser} parser parser
				 * @param {JavascriptParserOptions} parserOptions parser options
				 * @returns {void}
				 */
				const handler = (parser, { importMeta }) => {
					if (importMeta === false) {
						return;
					}

					// import.meta.env
					parser.hooks.typeof
						.for(fullImportMetaName)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);

					parser.hooks.expression
						.for(fullImportMetaName)
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new ConstDependency(
								`(${JSON.stringify(this.definitions)})`,
								/** @type {Range} */ (expr.range)
							);
							dep.loc =
								/** @type {import("../Dependency").DependencyLocation} */ (
									expr.loc
								);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.evaluateTypeof
						.for(fullImportMetaName)
						.tap(PLUGIN_NAME, evaluateToString("object"));

					parser.hooks.evaluateIdentifier.for(fullImportMetaName).tap(
						PLUGIN_NAME,
						evaluateToIdentifier(
							fullImportMetaName,
							importMetaName,
							() => [],
							true
						)
					);
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}

	/**
	 * @param {Record<string, EXPECTED_ANY>} options options
	 * @returns {void}
	 */
	updateOptions(options) {
		this.definitions = options;
	}
}

module.exports = ImportMetaEnvPlugin;
