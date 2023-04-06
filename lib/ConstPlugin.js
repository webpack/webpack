/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const CachedConstDependency = require("./dependencies/CachedConstDependency");
const ConstDependency = require("./dependencies/ConstDependency");
const { evaluateToString } = require("./javascript/JavascriptParserHelpers");
const { parseResource } = require("./util/identifier");

/** @typedef {import("estree").Expression} ExpressionNode */
/** @typedef {import("estree").Super} SuperNode */
/** @typedef {import("./Compiler")} Compiler */

const collectDeclaration = (declarations, pattern) => {
	const stack = [pattern];
	while (stack.length > 0) {
		const node = stack.pop();
		switch (node.type) {
			case "Identifier":
				declarations.add(node.name);
				break;
			case "ArrayPattern":
				for (const element of node.elements) {
					if (element) {
						stack.push(element);
					}
				}
				break;
			case "AssignmentPattern":
				stack.push(node.left);
				break;
			case "ObjectPattern":
				for (const property of node.properties) {
					stack.push(property.value);
				}
				break;
			case "RestElement":
				stack.push(node.argument);
				break;
		}
	}
};

const getHoistedDeclarations = (branch, includeFunctionDeclarations) => {
	const declarations = new Set();
	const stack = [branch];
	while (stack.length > 0) {
		const node = stack.pop();
		// Some node could be `null` or `undefined`.
		if (!node) continue;
		switch (node.type) {
			// Walk through control statements to look for hoisted declarations.
			// Some branches are skipped since they do not allow declarations.
			case "BlockStatement":
				for (const stmt of node.body) {
					stack.push(stmt);
				}
				break;
			case "IfStatement":
				stack.push(node.consequent);
				stack.push(node.alternate);
				break;
			case "ForStatement":
				stack.push(node.init);
				stack.push(node.body);
				break;
			case "ForInStatement":
			case "ForOfStatement":
				stack.push(node.left);
				stack.push(node.body);
				break;
			case "DoWhileStatement":
			case "WhileStatement":
			case "LabeledStatement":
				stack.push(node.body);
				break;
			case "SwitchStatement":
				for (const cs of node.cases) {
					for (const consequent of cs.consequent) {
						stack.push(consequent);
					}
				}
				break;
			case "TryStatement":
				stack.push(node.block);
				if (node.handler) {
					stack.push(node.handler.body);
				}
				stack.push(node.finalizer);
				break;
			case "FunctionDeclaration":
				if (includeFunctionDeclarations) {
					collectDeclaration(declarations, node.id);
				}
				break;
			case "VariableDeclaration":
				if (node.kind === "var") {
					for (const decl of node.declarations) {
						collectDeclaration(declarations, decl.id);
					}
				}
				break;
		}
	}
	return Array.from(declarations);
};

const PLUGIN_NAME = "ConstPlugin";

class ConstPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cachedParseResource = parseResource.bindCache(compiler.root);
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				compilation.dependencyTemplates.set(
					CachedConstDependency,
					new CachedConstDependency.Template()
				);

				const handler = parser => {
					parser.hooks.statementIf.tap(PLUGIN_NAME, statement => {
						if (parser.scope.isAsmJs) return;
						const param = parser.evaluateExpression(statement.test);
						const bool = param.asBool();
						if (typeof bool === "boolean") {
							if (!param.couldHaveSideEffects()) {
								const dep = new ConstDependency(`${bool}`, param.range);
								dep.loc = statement.loc;
								parser.state.module.addPresentationalDependency(dep);
							} else {
								parser.walkExpression(statement.test);
							}
							const branchToRemove = bool
								? statement.alternate
								: statement.consequent;
							if (branchToRemove) {
								// Before removing the dead branch, the hoisted declarations
								// must be collected.
								//
								// Given the following code:
								//
								//     if (true) f() else g()
								//     if (false) {
								//       function f() {}
								//       const g = function g() {}
								//       if (someTest) {
								//         let a = 1
								//         var x, {y, z} = obj
								//       }
								//     } else {
								//       …
								//     }
								//
								// the generated code is:
								//
								//     if (true) f() else {}
								//     if (false) {
								//       var f, x, y, z;   (in loose mode)
								//       var x, y, z;      (in strict mode)
								//     } else {
								//       …
								//     }
								//
								// NOTE: When code runs in strict mode, `var` declarations
								// are hoisted but `function` declarations don't.
								//
								let declarations;
								if (parser.scope.isStrict) {
									// If the code runs in strict mode, variable declarations
									// using `var` must be hoisted.
									declarations = getHoistedDeclarations(branchToRemove, false);
								} else {
									// Otherwise, collect all hoisted declaration.
									declarations = getHoistedDeclarations(branchToRemove, true);
								}
								let replacement;
								if (declarations.length > 0) {
									replacement = `{ var ${declarations.join(", ")}; }`;
								} else {
									replacement = "{}";
								}
								const dep = new ConstDependency(
									replacement,
									branchToRemove.range
								);
								dep.loc = branchToRemove.loc;
								parser.state.module.addPresentationalDependency(dep);
							}
							return bool;
						}
					});
					parser.hooks.expressionConditionalOperator.tap(
						PLUGIN_NAME,
						expression => {
							if (parser.scope.isAsmJs) return;
							const param = parser.evaluateExpression(expression.test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(` ${bool}`, param.range);
									dep.loc = expression.loc;
									parser.state.module.addPresentationalDependency(dep);
								} else {
									parser.walkExpression(expression.test);
								}
								// Expressions do not hoist.
								// It is safe to remove the dead branch.
								//
								// Given the following code:
								//
								//   false ? someExpression() : otherExpression();
								//
								// the generated code is:
								//
								//   false ? 0 : otherExpression();
								//
								const branchToRemove = bool
									? expression.alternate
									: expression.consequent;
								const dep = new ConstDependency("0", branchToRemove.range);
								dep.loc = branchToRemove.loc;
								parser.state.module.addPresentationalDependency(dep);
								return bool;
							}
						}
					);
					parser.hooks.expressionLogicalOperator.tap(
						PLUGIN_NAME,
						expression => {
							if (parser.scope.isAsmJs) return;
							if (
								expression.operator === "&&" ||
								expression.operator === "||"
							) {
								const param = parser.evaluateExpression(expression.left);
								const bool = param.asBool();
								if (typeof bool === "boolean") {
									// Expressions do not hoist.
									// It is safe to remove the dead branch.
									//
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   falsyExpression() && someExpression();
									//
									// the generated code is:
									//
									//   falsyExpression() && false;
									//
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   truthyExpression() && someExpression();
									//
									// the generated code is:
									//
									//   true && someExpression();
									//
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   truthyExpression() || someExpression();
									//
									// the generated code is:
									//
									//   truthyExpression() || false;
									//
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   falsyExpression() || someExpression();
									//
									// the generated code is:
									//
									//   false && someExpression();
									//
									const keepRight =
										(expression.operator === "&&" && bool) ||
										(expression.operator === "||" && !bool);

									if (
										!param.couldHaveSideEffects() &&
										(param.isBoolean() || keepRight)
									) {
										// for case like
										//
										//   return'development'===process.env.NODE_ENV&&'foo'
										//
										// we need a space before the bool to prevent result like
										//
										//   returnfalse&&'foo'
										//
										const dep = new ConstDependency(` ${bool}`, param.range);
										dep.loc = expression.loc;
										parser.state.module.addPresentationalDependency(dep);
									} else {
										parser.walkExpression(expression.left);
									}
									if (!keepRight) {
										const dep = new ConstDependency(
											"0",
											expression.right.range
										);
										dep.loc = expression.loc;
										parser.state.module.addPresentationalDependency(dep);
									}
									return keepRight;
								}
							} else if (expression.operator === "??") {
								const param = parser.evaluateExpression(expression.left);
								const keepRight = param.asNullish();
								if (typeof keepRight === "boolean") {
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   nonNullish ?? someExpression();
									//
									// the generated code is:
									//
									//   nonNullish ?? 0;
									//
									// ------------------------------------------
									//
									// Given the following code:
									//
									//   nullish ?? someExpression();
									//
									// the generated code is:
									//
									//   null ?? someExpression();
									//
									if (!param.couldHaveSideEffects() && keepRight) {
										// cspell:word returnnull
										// for case like
										//
										//   return('development'===process.env.NODE_ENV&&null)??'foo'
										//
										// we need a space before the bool to prevent result like
										//
										//   returnnull??'foo'
										//
										const dep = new ConstDependency(" null", param.range);
										dep.loc = expression.loc;
										parser.state.module.addPresentationalDependency(dep);
									} else {
										const dep = new ConstDependency(
											"0",
											expression.right.range
										);
										dep.loc = expression.loc;
										parser.state.module.addPresentationalDependency(dep);
										parser.walkExpression(expression.left);
									}

									return keepRight;
								}
							}
						}
					);
					parser.hooks.optionalChaining.tap(PLUGIN_NAME, expr => {
						/** @type {ExpressionNode[]} */
						const optionalExpressionsStack = [];
						/** @type {ExpressionNode|SuperNode} */
						let next = expr.expression;

						while (
							next.type === "MemberExpression" ||
							next.type === "CallExpression"
						) {
							if (next.type === "MemberExpression") {
								if (next.optional) {
									// SuperNode can not be optional
									optionalExpressionsStack.push(
										/** @type {ExpressionNode} */ (next.object)
									);
								}
								next = next.object;
							} else {
								if (next.optional) {
									// SuperNode can not be optional
									optionalExpressionsStack.push(
										/** @type {ExpressionNode} */ (next.callee)
									);
								}
								next = next.callee;
							}
						}

						while (optionalExpressionsStack.length) {
							const expression = optionalExpressionsStack.pop();
							const evaluated = parser.evaluateExpression(expression);

							if (evaluated.asNullish()) {
								// ------------------------------------------
								//
								// Given the following code:
								//
								//   nullishMemberChain?.a.b();
								//
								// the generated code is:
								//
								//   undefined;
								//
								// ------------------------------------------
								//
								const dep = new ConstDependency(" undefined", expr.range);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}
						}
					});
					parser.hooks.evaluateIdentifier
						.for("__resourceQuery")
						.tap(PLUGIN_NAME, expr => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToString(
								cachedParseResource(parser.state.module.resource).query
							)(expr);
						});
					parser.hooks.expression
						.for("__resourceQuery")
						.tap(PLUGIN_NAME, expr => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).query
								),
								expr.range,
								"__resourceQuery"
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.evaluateIdentifier
						.for("__resourceFragment")
						.tap(PLUGIN_NAME, expr => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToString(
								cachedParseResource(parser.state.module.resource).fragment
							)(expr);
						});
					parser.hooks.expression
						.for("__resourceFragment")
						.tap(PLUGIN_NAME, expr => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).fragment
								),
								expr.range,
								"__resourceFragment"
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = ConstPlugin;
