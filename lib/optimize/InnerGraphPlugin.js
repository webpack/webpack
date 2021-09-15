/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const PureExpressionDependency = require("../dependencies/PureExpressionDependency");
const InnerGraph = require("./InnerGraph");

/** @typedef {import("estree").ClassDeclaration} ClassDeclarationNode */
/** @typedef {import("estree").ClassExpression} ClassExpressionNode */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").VariableDeclarator} VariableDeclaratorNode */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../dependencies/HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InnerGraph").InnerGraph} InnerGraph */
/** @typedef {import("./InnerGraph").TopLevelSymbol} TopLevelSymbol */

const { topLevelSymbolTag } = InnerGraph;

class InnerGraphPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"InnerGraphPlugin",
			(compilation, { normalModuleFactory }) => {
				const logger = compilation.getLogger("webpack.InnerGraphPlugin");

				compilation.dependencyTemplates.set(
					PureExpressionDependency,
					new PureExpressionDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {Object} parserOptions options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					const onUsageSuper = sup => {
						InnerGraph.onUsage(parser.state, usedByExports => {
							switch (usedByExports) {
								case undefined:
								case true:
									return;
								default: {
									const dep = new PureExpressionDependency(sup.range);
									dep.loc = sup.loc;
									dep.usedByExports = usedByExports;
									parser.state.module.addDependency(dep);
									break;
								}
							}
						});
					};

					parser.hooks.program.tap("InnerGraphPlugin", () => {
						InnerGraph.enable(parser.state);
					});

					parser.hooks.finish.tap("InnerGraphPlugin", () => {
						if (!InnerGraph.isEnabled(parser.state)) return;

						logger.time("infer dependency usage");
						InnerGraph.inferDependencyUsage(parser.state);
						logger.timeAggregate("infer dependency usage");
					});

					// During prewalking the following datastructures are filled with
					// nodes that have a TopLevelSymbol assigned and
					// variables are tagged with the assigned TopLevelSymbol

					// We differ 3 types of nodes:
					// 1. full statements (export default, function declaration)
					// 2. classes (class declaration, class expression)
					// 3. variable declarators (const x = ...)

					/** @type {WeakMap<Node, TopLevelSymbol>} */
					const statementWithTopLevelSymbol = new WeakMap();
					/** @type {WeakMap<Node, Node>} */
					const statementPurePart = new WeakMap();

					/** @type {WeakMap<ClassExpressionNode | ClassDeclarationNode, TopLevelSymbol>} */
					const classWithTopLevelSymbol = new WeakMap();

					/** @type {WeakMap<VariableDeclaratorNode, TopLevelSymbol>} */
					const declWithTopLevelSymbol = new WeakMap();
					/** @type {WeakSet<VariableDeclaratorNode>} */
					const pureDeclarators = new WeakSet();

					// The following hooks are used during prewalking:

					parser.hooks.preStatement.tap("InnerGraphPlugin", statement => {
						if (!InnerGraph.isEnabled(parser.state)) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "FunctionDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								const fn = InnerGraph.tagTopLevelSymbol(parser, name);
								statementWithTopLevelSymbol.set(statement, fn);
								return true;
							}
						}
					});

					parser.hooks.blockPreStatement.tap("InnerGraphPlugin", statement => {
						if (!InnerGraph.isEnabled(parser.state)) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "ClassDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								const fn = InnerGraph.tagTopLevelSymbol(parser, name);
								classWithTopLevelSymbol.set(statement, fn);
								return true;
							}
							if (statement.type === "ExportDefaultDeclaration") {
								const name = "*default*";
								const fn = InnerGraph.tagTopLevelSymbol(parser, name);
								const decl = statement.declaration;
								if (
									decl.type === "ClassExpression" ||
									decl.type === "ClassDeclaration"
								) {
									classWithTopLevelSymbol.set(decl, fn);
								} else if (parser.isPure(decl, statement.range[0])) {
									statementWithTopLevelSymbol.set(statement, fn);
									if (
										!decl.type.endsWith("FunctionExpression") &&
										!decl.type.endsWith("Declaration") &&
										decl.type !== "Literal"
									) {
										statementPurePart.set(statement, decl);
									}
								}
							}
						}
					});

					parser.hooks.preDeclarator.tap(
						"InnerGraphPlugin",
						(decl, statement) => {
							if (!InnerGraph.isEnabled(parser.state)) return;
							if (
								parser.scope.topLevelScope === true &&
								decl.init &&
								decl.id.type === "Identifier"
							) {
								const name = decl.id.name;
								if (decl.init.type === "ClassExpression") {
									const fn = InnerGraph.tagTopLevelSymbol(parser, name);
									classWithTopLevelSymbol.set(decl.init, fn);
								} else if (parser.isPure(decl.init, decl.id.range[1])) {
									const fn = InnerGraph.tagTopLevelSymbol(parser, name);
									declWithTopLevelSymbol.set(decl, fn);
									if (
										!decl.init.type.endsWith("FunctionExpression") &&
										decl.init.type !== "Literal"
									) {
										pureDeclarators.add(decl);
									}
									return true;
								}
							}
						}
					);

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

					parser.hooks.statement.tap("InnerGraphPlugin", statement => {
						if (!InnerGraph.isEnabled(parser.state)) return;
						if (parser.scope.topLevelScope === true) {
							InnerGraph.setTopLevelSymbol(parser.state, undefined);

							const fn = statementWithTopLevelSymbol.get(statement);
							if (fn) {
								InnerGraph.setTopLevelSymbol(parser.state, fn);
								const purePart = statementPurePart.get(statement);
								if (purePart) {
									InnerGraph.onUsage(parser.state, usedByExports => {
										switch (usedByExports) {
											case undefined:
											case true:
												return;
											default: {
												const dep = new PureExpressionDependency(
													purePart.range
												);
												dep.loc = statement.loc;
												dep.usedByExports = usedByExports;
												parser.state.module.addDependency(dep);
												break;
											}
										}
									});
								}
							}
						}
					});

					parser.hooks.classExtendsExpression.tap(
						"InnerGraphPlugin",
						(expr, statement) => {
							if (!InnerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const fn = classWithTopLevelSymbol.get(statement);
								if (
									fn &&
									parser.isPure(
										expr,
										statement.id ? statement.id.range[1] : statement.range[0]
									)
								) {
									InnerGraph.setTopLevelSymbol(parser.state, fn);
									onUsageSuper(expr);
								}
							}
						}
					);

					parser.hooks.classBodyElement.tap(
						"InnerGraphPlugin",
						(element, classDefinition) => {
							if (!InnerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const fn = classWithTopLevelSymbol.get(classDefinition);
								if (fn) {
									InnerGraph.setTopLevelSymbol(parser.state, undefined);
								}
							}
						}
					);

					parser.hooks.classBodyValue.tap(
						"InnerGraphPlugin",
						(expression, element, classDefinition) => {
							if (!InnerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const fn = classWithTopLevelSymbol.get(classDefinition);
								if (fn) {
									if (
										!element.static ||
										parser.isPure(
											expression,
											element.key ? element.key.range[1] : element.range[0]
										)
									) {
										InnerGraph.setTopLevelSymbol(parser.state, fn);
										if (element.type !== "MethodDefinition" && element.static) {
											InnerGraph.onUsage(parser.state, usedByExports => {
												switch (usedByExports) {
													case undefined:
													case true:
														return;
													default: {
														const dep = new PureExpressionDependency(
															expression.range
														);
														dep.loc = expression.loc;
														dep.usedByExports = usedByExports;
														parser.state.module.addDependency(dep);
														break;
													}
												}
											});
										}
									} else {
										InnerGraph.setTopLevelSymbol(parser.state, undefined);
									}
								}
							}
						}
					);

					parser.hooks.declarator.tap("InnerGraphPlugin", (decl, statement) => {
						if (!InnerGraph.isEnabled(parser.state)) return;
						const fn = declWithTopLevelSymbol.get(decl);

						if (fn) {
							InnerGraph.setTopLevelSymbol(parser.state, fn);
							if (pureDeclarators.has(decl)) {
								if (decl.init.type === "ClassExpression") {
									if (decl.init.superClass) {
										onUsageSuper(decl.init.superClass);
									}
								} else {
									InnerGraph.onUsage(parser.state, usedByExports => {
										switch (usedByExports) {
											case undefined:
											case true:
												return;
											default: {
												const dep = new PureExpressionDependency(
													decl.init.range
												);
												dep.loc = decl.loc;
												dep.usedByExports = usedByExports;
												parser.state.module.addDependency(dep);
												break;
											}
										}
									});
								}
							}
							parser.walkExpression(decl.init);
							InnerGraph.setTopLevelSymbol(parser.state, undefined);
							return true;
						}
					});

					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap("InnerGraphPlugin", () => {
							const topLevelSymbol = /** @type {TopLevelSymbol} */ (
								parser.currentTagData
							);
							const currentTopLevelSymbol = InnerGraph.getTopLevelSymbol(
								parser.state
							);
							InnerGraph.addUsage(
								parser.state,
								topLevelSymbol,
								currentTopLevelSymbol || true
							);
						});
					parser.hooks.assign
						.for(topLevelSymbolTag)
						.tap("InnerGraphPlugin", expr => {
							if (!InnerGraph.isEnabled(parser.state)) return;
							if (expr.operator === "=") return true;
						});
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("InnerGraphPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("InnerGraphPlugin", handler);

				compilation.hooks.finishModules.tap("InnerGraphPlugin", () => {
					logger.timeAggregateEnd("infer dependency usage");
				});
			}
		);
	}
}

module.exports = InnerGraphPlugin;
