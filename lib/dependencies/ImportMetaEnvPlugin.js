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
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const ConstDependency = require("./ConstDependency");

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

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
				/**
				 * @param {JavascriptParser} parser parser
				 * @param {JavascriptParserOptions} parserOptions parser options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (
						parserOptions.importMetaEnv !== undefined &&
						!parserOptions.importMetaEnv
					) {
						return;
					}

					// Handle typeof import.meta.env - direct code replacement
					// Example: typeof import.meta.env → "object"
					parser.hooks.typeof
						.for("import.meta.env")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);

					// Handle import.meta.env (entire object access)
					// Example: const env = import.meta.env → const env = { API_URL: "...", DEBUG: true }
					parser.hooks.expression
						.for("import.meta.env")
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

					// Evaluate typeof at compile time - semantic analysis for optimization
					// Example: if (typeof import.meta.env === "object") → optimizer knows this is always true
					parser.hooks.evaluateTypeof
						.for("import.meta.env")
						.tap(PLUGIN_NAME, evaluateToString("object"));
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
