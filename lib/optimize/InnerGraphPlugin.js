/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const PureExpressionDependency = require("../dependencies/PureExpressionDependency");
const InnerGraph = require("./InnerGraph");

/** @typedef {import("estree").ClassDeclaration} ClassDeclaration */
/** @typedef {import("estree").ClassExpression} ClassExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").MaybeNamedClassDeclaration} MaybeNamedClassDeclaration */
/** @typedef {import("estree").MaybeNamedFunctionDeclaration} MaybeNamedFunctionDeclaration */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").VariableDeclarator} VariableDeclarator */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./InnerGraph").TopLevelSymbol} TopLevelSymbol */

const { topLevelSymbolTag } = InnerGraph;

const PLUGIN_NAME = "InnerGraphPlugin";

class InnerGraphPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const logger = compilation.getLogger("webpack.InnerGraphPlugin");
				const innerGraph = InnerGraph.getInnerGraph(compilation);

				compilation.dependencyTemplates.set(
					PureExpressionDependency,
					new PureExpressionDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					/**
					 * Processes the provided sup.
					 * @param {Expression} sup sup
					 */
					const onUsageSuper = (sup) => {
						innerGraph.onUsage(parser.state, (usedByExports, module) => {
							switch (usedByExports) {
								case undefined:
								case true:
									return;
								default: {
									const dep = new PureExpressionDependency(
										/** @type {Range} */
										(sup.range)
									);
									dep.loc = /** @type {DependencyLocation} */ (sup.loc);
									dep.usedByExports = usedByExports;
									module.addDependency(dep);
									break;
								}
							}
						});
					};

					parser.hooks.program.tap(PLUGIN_NAME, () => {
						innerGraph.enable(parser.state);

						statementWithTopLevelSymbol = new WeakMap();
						statementPurePart = new WeakMap();
						classWithTopLevelSymbol = new WeakMap();
						declWithTopLevelSymbol = new WeakMap();
						pureDeclarators = new WeakSet();
					});

					// During prewalking the following datastructures are filled with
					// nodes that have a TopLevelSymbol assigned and
					// variables are tagged with the assigned TopLevelSymbol

					// We differ 3 types of nodes:
					// 1. full statements (export default, function declaration)
					// 2. classes (class declaration, class expression)
					// 3. variable declarators (const x = ...)

					/** @type {WeakMap<Node | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration, TopLevelSymbol>} */
					let statementWithTopLevelSymbol = new WeakMap();
					/** @type {WeakMap<Node | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration, Node>} */
					let statementPurePart = new WeakMap();

					/** @type {WeakMap<ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration, TopLevelSymbol>} */
					let classWithTopLevelSymbol = new WeakMap();

					/** @type {WeakMap<VariableDeclarator, TopLevelSymbol>} */
					let declWithTopLevelSymbol = new WeakMap();
					/** @type {WeakSet<VariableDeclarator>} */
					let pureDeclarators = new WeakSet();

					// The following hooks are used during prewalking:

					parser.hooks.preStatement.tap(PLUGIN_NAME, (statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;

						if (
							parser.scope.topLevelScope === true &&
							statement.type === "FunctionDeclaration"
						) {
							const name = statement.id ? statement.id.name : "*default*";
							const symbol = /** @type {TopLevelSymbol} */ (
								innerGraph.tagTopLevelSymbol(
									parser,
									name,
									parser.isPure(
										statement,
										/** @type {Range} */ (statement.range)[0]
									)
								)
							);
							statementWithTopLevelSymbol.set(statement, symbol);
							return true;
						}
					});

					parser.hooks.blockPreStatement.tap(PLUGIN_NAME, (statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "ClassDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								const pure = parser.isPure(
									statement,
									/** @type {Range} */ (statement.range)[0]
								);
								const symbol = /** @type {TopLevelSymbol} */ (
									innerGraph.tagTopLevelSymbol(parser, name, pure)
								);
								classWithTopLevelSymbol.set(statement, symbol);
								return true;
							}
							if (statement.type === "ExportDefaultDeclaration") {
								const name = "*default*";
								const decl = statement.declaration;
								const pure = parser.isPure(
									decl,
									/** @type {Range} */
									(statement.range)[0]
								);
								const symbol =
									/** @type {TopLevelSymbol} */
									(innerGraph.tagTopLevelSymbol(parser, name, pure));
								if (
									decl.type === "ClassExpression" ||
									decl.type === "ClassDeclaration"
								) {
									classWithTopLevelSymbol.set(
										/** @type {ClassExpression | ClassDeclaration} */
										(decl),
										symbol
									);
								} else {
									statementWithTopLevelSymbol.set(statement, symbol);
									if (
										pure &&
										!decl.type.endsWith("FunctionExpression") &&
										!decl.type.endsWith("Declaration") &&
										decl.type !== "Literal"
									) {
										statementPurePart.set(
											statement,
											/** @type {Expression} */
											(decl)
										);
									}
								}
							}
						}
					});

					parser.hooks.preDeclarator.tap(PLUGIN_NAME, (decl, _statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;
						if (
							parser.scope.topLevelScope === true &&
							decl.init &&
							decl.id.type === "Identifier"
						) {
							const name = decl.id.name;
							// Skip webpack runtime variables handled by CompatibilityPlugin
							if (
								name === RuntimeGlobals.require ||
								name === RuntimeGlobals.exports
							) {
								return;
							}
							const pure = parser.isPure(
								decl.init,
								/** @type {Range} */ (decl.id.range)[1]
							);
							if (decl.init.type === "ClassExpression") {
								const symbol =
									/** @type {TopLevelSymbol} */
									(innerGraph.tagTopLevelSymbol(parser, name, pure));
								classWithTopLevelSymbol.set(decl.init, symbol);
							} else {
								const symbol =
									/** @type {TopLevelSymbol} */
									(innerGraph.tagTopLevelSymbol(parser, name, pure));
								declWithTopLevelSymbol.set(decl, symbol);
								if (
									pure &&
									!decl.init.type.endsWith("FunctionExpression") &&
									decl.init.type !== "Literal"
								) {
									pureDeclarators.add(decl);
								}
							}
						}
					});

					// During real walking we set the TopLevelSymbol state to the assigned
					// TopLevelSymbol by using the fill datastructures.

					// In addition to tracking TopLevelSymbols, we sometimes need to
					// add a PureExpressionDependency. This is needed to skip execution
					// of pure expressions, even when they are not dropped due to
					// minimizing. Otherwise symbols used there might not exist anymore
					// as they are removed as unused by this optimization

					// When we find a reference to a TopLevelSymbol, we register a
					// TopLevelSymbol dependency from TopLevelSymbol in state to the
					// referenced TopLevelSymbol. This way we get a graph of all
					// TopLevelSymbols.

					// The following hooks are called during walking:

					parser.hooks.statement.tap(PLUGIN_NAME, (statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;
						if (parser.scope.topLevelScope === true) {
							innerGraph.setTopLevelSymbol(parser.state, undefined);

							const symbol = statementWithTopLevelSymbol.get(statement);
							if (symbol) {
								innerGraph.setTopLevelSymbol(parser.state, symbol);
								const purePart = statementPurePart.get(statement);
								if (purePart) {
									innerGraph.onUsage(parser.state, (usedByExports, module) => {
										switch (usedByExports) {
											case undefined:
											case true:
												return;
											default: {
												const dep = new PureExpressionDependency(
													/** @type {Range} */ (purePart.range)
												);
												dep.loc =
													/** @type {DependencyLocation} */
													(statement.loc);
												dep.usedByExports = usedByExports;
												module.addDependency(dep);
												break;
											}
										}
									});
								}
							}
						}
					});

					parser.hooks.classExtendsExpression.tap(
						PLUGIN_NAME,
						(expr, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(statement);
								if (
									symbol &&
									parser.isPure(
										expr,
										statement.id
											? /** @type {Range} */ (statement.id.range)[1]
											: /** @type {Range} */ (statement.range)[0]
									)
								) {
									innerGraph.setTopLevelSymbol(parser.state, symbol);
									onUsageSuper(expr);
								}
							}
						}
					);

					parser.hooks.classBodyElement.tap(
						PLUGIN_NAME,
						(element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(classDefinition);
								if (symbol) {
									innerGraph.setTopLevelSymbol(parser.state, undefined);
								}
							}
						}
					);

					parser.hooks.classBodyValue.tap(
						PLUGIN_NAME,
						(expression, element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(classDefinition);
								if (symbol) {
									if (
										!element.static ||
										parser.isPure(
											expression,
											element.key
												? /** @type {Range} */ (element.key.range)[1]
												: /** @type {Range} */ (element.range)[0]
										)
									) {
										innerGraph.setTopLevelSymbol(parser.state, symbol);
										if (element.type !== "MethodDefinition" && element.static) {
											innerGraph.onUsage(
												parser.state,
												(usedByExports, module) => {
													switch (usedByExports) {
														case undefined:
														case true:
															return;
														default: {
															const dep = new PureExpressionDependency(
																/** @type {Range} */ (expression.range)
															);
															dep.loc =
																/** @type {DependencyLocation} */
																(expression.loc);
															dep.usedByExports = usedByExports;
															module.addDependency(dep);
															break;
														}
													}
												}
											);
										}
									} else {
										innerGraph.setTopLevelSymbol(parser.state, undefined);
									}
								}
							}
						}
					);

					parser.hooks.declarator.tap(PLUGIN_NAME, (decl, _statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;
						const symbol = declWithTopLevelSymbol.get(decl);

						if (symbol) {
							innerGraph.setTopLevelSymbol(parser.state, symbol);
							if (pureDeclarators.has(decl)) {
								if (
									/** @type {ClassExpression} */
									(decl.init).type === "ClassExpression"
								) {
									if (decl.init.superClass) {
										onUsageSuper(decl.init.superClass);
									}
								} else {
									innerGraph.onUsage(parser.state, (usedByExports, module) => {
										switch (usedByExports) {
											case undefined:
											case true:
												return;
											default: {
												const dep = new PureExpressionDependency(
													/** @type {Range} */ (
														/** @type {ClassExpression} */
														(decl.init).range
													)
												);
												dep.loc = /** @type {DependencyLocation} */ (decl.loc);
												dep.usedByExports = usedByExports;
												module.addDependency(dep);
												break;
											}
										}
									});
								}
							}
							parser.walkExpression(
								/** @type {NonNullable<VariableDeclarator["init"]>} */ (
									decl.init
								)
							);
							innerGraph.setTopLevelSymbol(parser.state, undefined);
							return true;
						} else if (
							decl.id.type === "Identifier" &&
							decl.init &&
							decl.init.type === "ClassExpression" &&
							classWithTopLevelSymbol.has(decl.init)
						) {
							parser.walkExpression(decl.init);
							innerGraph.setTopLevelSymbol(parser.state, undefined);
							return true;
						}
					});

					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap(PLUGIN_NAME, () => {
							const topLevelSymbol = /** @type {TopLevelSymbol} */ (
								parser.currentTagData
							);
							const currentTopLevelSymbol = innerGraph.getTopLevelSymbol(
								parser.state
							);
							innerGraph.addUsage(
								parser.state,
								topLevelSymbol,
								currentTopLevelSymbol || true
							);
						});
					parser.hooks.assign
						.for(topLevelSymbolTag)
						.tap(PLUGIN_NAME, (expr) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (expr.operator === "=") return true;
						});
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);

				compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
					logger.time("infer dependency usage");
					for (const module of modules) {
						innerGraph.inferDependencyUsage(module);
					}
					logger.timeEnd("infer dependency usage");
				});
			}
		);
	}
}

module.exports = InnerGraphPlugin;
