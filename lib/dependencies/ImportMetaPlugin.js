/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
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

const PLUGIN_NAME = "ImportMetaPlugin";

class ImportMetaPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
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
							.tap(PLUGIN_NAME, metaProperty => {
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
					const webpackVersion = parseInt(
						require("../../package.json").version,
						10
					);
					const importMetaUrl = () =>
						JSON.stringify(getUrl(parser.state.module));
					const importMetaWebpackVersion = () => JSON.stringify(webpackVersion);
					const importMetaUnknownProperty = members =>
						`${Template.toNormalComment(
							"unsupported import.meta." + members.join(".")
						)} undefined${propertyAccess(members, 1)}`;
					parser.hooks.typeof
						.for("import.meta")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.expression
						.for("import.meta")
						.tap(PLUGIN_NAME, metaProperty => {
							const referencedPropertiesInDestructuring =
								parser.destructuringAssignmentPropertiesFor(metaProperty);
							if (!referencedPropertiesInDestructuring) {
								const CriticalDependencyWarning =
									getCriticalDependencyWarning();
								parser.state.module.addWarning(
									new ModuleDependencyWarning(
										parser.state.module,
										new CriticalDependencyWarning(
											"Accessing import.meta directly is unsupported (only property access or destructuring is supported)"
										),
										metaProperty.loc
									)
								);
								const dep = new ConstDependency(
									`${
										parser.isAsiPosition(metaProperty.range[0]) ? ";" : ""
									}({})`,
									metaProperty.range
								);
								dep.loc = metaProperty.loc;
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}

							let str = "";
							for (const prop of referencedPropertiesInDestructuring) {
								switch (prop) {
									case "url":
										str += `url: ${importMetaUrl()},`;
										break;
									case "webpack":
										str += `webpack: ${importMetaWebpackVersion()},`;
										break;
									default:
										str += `[${JSON.stringify(
											prop
										)}]: ${importMetaUnknownProperty([prop])},`;
										break;
								}
							}
							const dep = new ConstDependency(`({${str}})`, metaProperty.range);
							dep.loc = metaProperty.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta")
						.tap(PLUGIN_NAME, evaluateToString("object"));
					parser.hooks.evaluateIdentifier.for("import.meta").tap(
						PLUGIN_NAME,
						evaluateToIdentifier("import.meta", "import.meta", () => [], true)
					);

					/// import.meta.url ///
					parser.hooks.typeof
						.for("import.meta.url")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("string"))
						);
					parser.hooks.expression
						.for("import.meta.url")
						.tap(PLUGIN_NAME, expr => {
							const dep = new ConstDependency(importMetaUrl(), expr.range);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta.url")
						.tap(PLUGIN_NAME, evaluateToString("string"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.url")
						.tap(PLUGIN_NAME, expr => {
							return new BasicEvaluatedExpression()
								.setString(getUrl(parser.state.module))
								.setRange(expr.range);
						});

					/// import.meta.webpack ///
					parser.hooks.typeof
						.for("import.meta.webpack")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("number"))
						);
					parser.hooks.expression
						.for("import.meta.webpack")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, importMetaWebpackVersion())
						);
					parser.hooks.evaluateTypeof
						.for("import.meta.webpack")
						.tap(PLUGIN_NAME, evaluateToString("number"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.webpack")
						.tap(PLUGIN_NAME, evaluateToNumber(webpackVersion));

					/// Unknown properties ///
					parser.hooks.unhandledExpressionMemberChain
						.for("import.meta")
						.tap(PLUGIN_NAME, (expr, members) => {
							const dep = new ConstDependency(
								importMetaUnknownProperty(members),
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluate
						.for("MemberExpression")
						.tap(PLUGIN_NAME, expression => {
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
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, parserHandler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, parserHandler);
			}
		);
	}
}

module.exports = ImportMetaPlugin;
