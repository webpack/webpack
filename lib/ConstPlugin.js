/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedConstDependency = require("./dependencies/CachedConstDependency");
const ConstDependency = require("./dependencies/ConstDependency");
const { evaluateToString } = require("./javascript/JavascriptParserHelpers");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./module/ModuleTypeConstants");
const { parseResource } = require("./util/identifier");

/**
 * @import {
 * 	AssignmentProperty,
 * 	Expression,
 * 	Identifier,
 * 	Pattern,
 * 	Statement,
 * 	Super,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import Compiler from "./Compiler" */
/** @import JavascriptParser, { Range } from "./javascript/JavascriptParser" */

/** @typedef {Set<string>} Declarations */

/**
 * Collect declaration.
 * @param {Declarations} declarations set of declarations
 * @param {Identifier | Pattern} pattern pattern to collect declarations from
 */
const collectDeclaration = (declarations, pattern) => {
	const stack = [pattern];
	while (stack.length > 0) {
		const node = /** @type {Pattern} */ (stack.pop());
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
					stack.push(/** @type {AssignmentProperty} */ (property).value);
				}
				break;
			case "RestElement":
				stack.push(node.argument);
				break;
		}
	}
};

/**
 * Gets hoisted declarations.
 * @param {Statement} branch branch to get hoisted declarations from
 * @param {boolean} includeFunctionDeclarations whether to include function declarations
 * @returns {string[]} hoisted declarations
 */
const getHoistedDeclarations = (branch, includeFunctionDeclarations) => {
	/** @type {Declarations} */
	const declarations = new Set();
	/** @type {(Statement | null | undefined)[]} */
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
				stack.push(/** @type {VariableDeclaration} */ (node.init));
				stack.push(node.body);
				break;
			case "ForInStatement":
			case "ForOfStatement":
				stack.push(/** @type {VariableDeclaration} */ (node.left));
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
					collectDeclaration(declarations, /** @type {Identifier} */ (node.id));
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
	return [...declarations];
};

const PLUGIN_NAME = "ConstPlugin";

class ConstPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
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

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 */
				const handler = (parser) => {
					parser.hooks.terminate.tap(PLUGIN_NAME, (_statement) => true);
					parser.hooks.statementIf.tap(PLUGIN_NAME, (statement) => {
						if (parser.scope.isAsmJs) return;
						const param = parser.evaluateExpression(statement.test);
						const bool = param.asBool();
						if (typeof bool === "boolean") {
							if (!param.couldHaveSideEffects()) {
								const dep = new ConstDependency(
									`${bool}`,
									/** @type {Range} */ (param.range)
								);
								dep.loc = parser.getLocation(statement);
								parser.state.module.addPresentationalDependency(dep);
							} else {
								parser.walkExpression(statement.test);
							}
							const branchToRemove = bool
								? statement.alternate
								: statement.consequent;
							if (branchToRemove) {
								this.eliminateUnusedStatement(parser, branchToRemove, true);
							}
							return bool;
						}
					});
					parser.hooks.unusedStatement.tap(PLUGIN_NAME, (statement) => {
						if (
							parser.scope.isAsmJs ||
							// Check top level scope here again
							parser.scope.topLevelScope === true
						) {
							return;
						}
						this.eliminateUnusedStatement(parser, statement, false);
						return true;
					});
					parser.hooks.expressionConditionalOperator.tap(
						PLUGIN_NAME,
						(expression) => {
							if (parser.scope.isAsmJs) return;
							const param = parser.evaluateExpression(expression.test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(
										` ${bool}`,
										/** @type {Range} */ (param.range)
									);
									dep.loc = parser.getLocation(expression);
									parser.state.module.addPresentationalDependency(dep);
								} else {
									parser.walkExpression(expression.test);
								}
								// Expressions do not hoist, so the dead branch is safe to remove:
								// `false ? someExpression() : other()` becomes `false ? 0 : other()`.
								const branchToRemove = bool
									? expression.alternate
									: expression.consequent;
								const dep = new ConstDependency(
									"0",
									/** @type {Range} */ (branchToRemove.range)
								);
								dep.loc = parser.getLocation(branchToRemove);
								parser.state.module.addPresentationalDependency(dep);
								return bool;
							}
						}
					);
					parser.hooks.expressionLogicalOperator.tap(
						PLUGIN_NAME,
						(expression) => {
							if (parser.scope.isAsmJs) return;
							if (
								expression.operator === "&&" ||
								expression.operator === "||"
							) {
								const param = parser.evaluateExpression(expression.left);
								const bool = param.asBool();
								if (typeof bool === "boolean") {
									// Expressions do not hoist, so the dead branch is safe to remove.
									// Whichever side cannot decide the result is replaced, leaving the
									// deciding side and its side effects in place.
									const keepRight =
										(expression.operator === "&&" && bool) ||
										(expression.operator === "||" && !bool);

									if (
										!param.couldHaveSideEffects() &&
										(param.isBoolean() || keepRight)
									) {
										// The bool needs a leading space: `return'a'===b&&'foo'` would
										// otherwise become `returnfalse&&'foo'`.
										const dep = new ConstDependency(
											` ${bool}`,
											/** @type {Range} */ (param.range)
										);
										dep.loc = parser.getLocation(expression);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										parser.walkExpression(expression.left);
									}
									if (!keepRight) {
										const dep = new ConstDependency(
											"0",
											/** @type {Range} */ (expression.right.range)
										);
										dep.loc = parser.getLocation(expression);
										parser.state.module.addPresentationalDependency(dep);
									}
									return keepRight;
								}
							} else if (expression.operator === "??") {
								const param = parser.evaluateExpression(expression.left);
								const keepRight = param.asNullish();
								if (typeof keepRight === "boolean") {
									// `nonNullish ?? x` becomes `nonNullish ?? 0`, and `nullish ?? x`
									// becomes `null ?? x`: the unreachable side is replaced.
									if (!param.couldHaveSideEffects() && keepRight) {
										// cspell:word returnnull
										// As above, the value needs a leading space, or `return(…&&null)`
										// would become `returnnull??'foo'`.
										const dep = new ConstDependency(
											" null",
											/** @type {Range} */ (param.range)
										);
										dep.loc = parser.getLocation(expression);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										const dep = new ConstDependency(
											"0",
											/** @type {Range} */ (expression.right.range)
										);
										dep.loc = parser.getLocation(expression);
										parser.state.module.addPresentationalDependency(dep);
										parser.walkExpression(expression.left);
									}

									return keepRight;
								}
							}
						}
					);
					parser.hooks.optionalChaining.tap(PLUGIN_NAME, (expr) => {
						/** @type {Expression[]} */
						const optionalExpressionsStack = [];
						/** @type {Expression | Super} */
						let next = expr.expression;

						while (
							next.type === "MemberExpression" ||
							next.type === "CallExpression"
						) {
							if (next.type === "MemberExpression") {
								if (next.optional) {
									// SuperNode can not be optional
									optionalExpressionsStack.push(
										/** @type {Expression} */ (next.object)
									);
								}
								next = next.object;
							} else {
								if (next.optional) {
									// SuperNode can not be optional
									optionalExpressionsStack.push(
										/** @type {Expression} */ (next.callee)
									);
								}
								next = next.callee;
							}
						}

						while (optionalExpressionsStack.length) {
							const expression = optionalExpressionsStack.pop();
							const evaluated = parser.evaluateExpression(
								/** @type {Expression} */ (expression)
							);

							if (evaluated.asNullish()) {
								// A nullish chain short-circuits whole, so `nullish?.a.b()`
								// becomes `undefined`.
								const dep = new ConstDependency(
									" undefined",
									/** @type {Range} */ (expr.range)
								);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}
						}
					});
					parser.hooks.evaluateIdentifier
						.for("__resourceQuery")
						.tap(PLUGIN_NAME, (expr) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToString(
								cachedParseResource(parser.state.module.resource).query
							)(expr);
						});
					parser.hooks.expression
						.for("__resourceQuery")
						.tap(PLUGIN_NAME, (expr) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).query
								),
								/** @type {Range} */ (expr.range),
								"__resourceQuery"
							);
							dep.loc = parser.getLocation(expr);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.evaluateIdentifier
						.for("__resourceFragment")
						.tap(PLUGIN_NAME, (expr) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToString(
								cachedParseResource(parser.state.module.resource).fragment
							)(expr);
						});
					parser.hooks.expression
						.for("__resourceFragment")
						.tap(PLUGIN_NAME, (expr) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).fragment
								),
								/** @type {Range} */ (expr.range),
								"__resourceFragment"
							);
							dep.loc = parser.getLocation(expr);
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

	/**
	 * Eliminate an unused statement.
	 * @param {JavascriptParser} parser the parser
	 * @param {Statement} statement the statement to remove
	 * @param {boolean} alwaysInBlock whether to always generate curly brackets
	 * @returns {void}
	 */
	eliminateUnusedStatement(parser, statement, alwaysInBlock) {
		// The hoisted declarations must be collected before the unused branch goes,
		// since the removed code still contributes them. In strict mode `var` is
		// hoisted but `function` is not, so the two modes collect different sets.
		const declarations = parser.scope.isStrict
			? getHoistedDeclarations(statement, false)
			: getHoistedDeclarations(statement, true);

		const inBlock = alwaysInBlock || statement.type === "BlockStatement";

		let replacement = inBlock ? "{" : "";
		replacement +=
			declarations.length > 0 ? ` var ${declarations.join(", ")}; ` : "";
		replacement += inBlock ? "}" : "";

		const dep = new ConstDependency(
			`// removed by dead control flow\n${replacement}`,
			/** @type {Range} */ (statement.range)
		);
		dep.loc = parser.getLocation(statement);
		parser.state.module.addPresentationalDependency(dep);
	}
}

module.exports = ConstPlugin;
