/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const {
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

					parser.hooks.typeof
						.for("import.meta.env")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);

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

					parser.hooks.evaluateTypeof
						.for("import.meta.env")
						.tap(PLUGIN_NAME, evaluateToString("object"));

					// if (import.meta.env.NO_DEFINE) {}
					parser.hooks.evaluate
						.for("MemberExpression")
						.tap(PLUGIN_NAME, (expression) => {
							const expr = /** @type {MemberExpression} */ (expression);
							const metaExpr = /** @type {MemberExpression} */ (expr.object);
							const isMetaMemberExpression =
								metaExpr.object &&
								metaExpr.object.type === "MetaProperty" &&
								metaExpr.object.meta.name === "import" &&
								metaExpr.object.property.name === "meta" &&
								metaExpr.property.type ===
									(metaExpr.computed ? "Literal" : "Identifier");
							if (
								isMetaMemberExpression &&
								expr.property.type ===
									(expr.computed ? "Literal" : "Identifier") &&
								!this.definitions[
									/** @type {Identifier} */ (expr.property).name
								]
							) {
								return new BasicEvaluatedExpression()
									.setUndefined()
									.setRange(/** @type {Range} */ (expr.range));
							}
						});
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
