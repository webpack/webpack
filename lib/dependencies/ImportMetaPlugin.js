/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const Template = require("../Template");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const {
	evaluateToIdentifier,
	toConstantDependency,
	evaluateToString,
	evaluateToNumber
} = require("../javascript/JavascriptParserHelpers");
const memoize = require("../util/memoize");
const propertyAccess = require("../util/propertyAccess");
const ConstDependency = require("./ConstDependency");

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} Parser */

const getCriticalDependencyWarning = memoize(() =>
	require("./CriticalDependencyWarning")
);

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
				 * @returns {string} file url
				 */
				const getUrl = module => {
					return pathToFileURL(module.resource).toString();
				};
				/**
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserHandler = (parser, { importMeta }) => {
					if (importMeta === false) {
						const { importMetaName } = compilation.outputOptions;
						if (importMetaName === "import.meta") return;

						parser.hooks.expression
							.for("import.meta")
							.tap("ImportMetaPlugin", metaProperty => {
								const dep = new ConstDependency(
									importMetaName,
									metaProperty.range
								);
								dep.loc = metaProperty.loc;
								parser.state.module.addPresentationalDependency(dep);
								return true;
							});
						return;
					}

					/// import.meta direct ///
					parser.hooks.typeof
						.for("import.meta")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.expression
						.for("import.meta")
						.tap("ImportMetaPlugin", metaProperty => {
							const CriticalDependencyWarning = getCriticalDependencyWarning();
							parser.state.module.addWarning(
								new ModuleDependencyWarning(
									parser.state.module,
									new CriticalDependencyWarning(
										"Accessing import.meta directly is unsupported (only property access is supported)"
									),
									metaProperty.loc
								)
							);
							const dep = new ConstDependency(
								`${parser.isAsiPosition(metaProperty.range[0]) ? ";" : ""}({})`,
								metaProperty.range
							);
							dep.loc = metaProperty.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta")
						.tap("ImportMetaPlugin", evaluateToString("object"));
					parser.hooks.evaluateIdentifier.for("import.meta").tap(
						"ImportMetaPlugin",
						evaluateToIdentifier("import.meta", "import.meta", () => [], true)
					);

					/// import.meta.url ///
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
					parser.hooks.evaluateTypeof
						.for("import.meta.url")
						.tap("ImportMetaPlugin", evaluateToString("string"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.url")
						.tap("ImportMetaPlugin", expr => {
							return new BasicEvaluatedExpression()
								.setString(getUrl(parser.state.module))
								.setRange(expr.range);
						});

					/// import.meta.webpack ///
					const webpackVersion = parseInt(
						require("../../package.json").version,
						10
					);
					parser.hooks.typeof
						.for("import.meta.webpack")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify("number"))
						);
					parser.hooks.expression
						.for("import.meta.webpack")
						.tap(
							"ImportMetaPlugin",
							toConstantDependency(parser, JSON.stringify(webpackVersion))
						);
					parser.hooks.evaluateTypeof
						.for("import.meta.webpack")
						.tap("ImportMetaPlugin", evaluateToString("number"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.webpack")
						.tap("ImportMetaPlugin", evaluateToNumber(webpackVersion));

					/// Unknown properties ///
					parser.hooks.unhandledExpressionMemberChain
						.for("import.meta")
						.tap("ImportMetaPlugin", (expr, members) => {
							const dep = new ConstDependency(
								`${Template.toNormalComment(
									"unsupported import.meta." + members.join(".")
								)} undefined${propertyAccess(members, 1)}`,
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluate
						.for("MemberExpression")
						.tap("ImportMetaPlugin", expression => {
							const expr = /** @type {MemberExpression} */ (expression);
							if (
								expr.object.type === "MetaProperty" &&
								expr.object.meta.name === "import" &&
								expr.object.property.name === "meta" &&
								expr.property.type ===
									(expr.computed ? "Literal" : "Identifier")
							) {
								return new BasicEvaluatedExpression()
									.setUndefined()
									.setRange(expr.range);
							}
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
