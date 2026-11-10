/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedConstDependency = require("../dependencies/core/CachedConstDependency");
const ConstDependency = require("../dependencies/core/ConstDependency");
const { evaluateToString } = require("../javascript/JavascriptParserHelpers");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { parseResource } = require("../util/identifier");
const { Field, Flag, NodeType, Part } = require("./syntax-parser");

/**
 * @import {
 * 	AssignmentProperty,
 * 	Expression,
 * 	Identifier,
 * 	LogicalExpression,
 * 	Pattern,
 * 	Statement,
 * 	Super,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import Compiler from "../Compiler" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "../javascript/JavascriptParser" */

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
	return [...declarations];
};

const PLUGIN_NAME = "ConstPlugin";

/**
 * Whether the built-in evaluator cannot resolve an operand: a member chain,
 * as `getMemberExpressionRoot` follows it, rooted at a defined local name.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the operand's nodes
 * @param {number} expression the operand
 * @returns {boolean} whether the built-in evaluator cannot resolve the operand
 */
const isUnknownLocal = (parser, path, expression) => {
	let root = expression;
	while (path.type(root) === NodeType.MemberExpression) {
		const property = path.field(0, Field.property, root);
		const type = path.type(property);
		if (path.flag(Flag.computed, root)) {
			if (
				type !== NodeType.Literal &&
				!(
					type === NodeType.TemplateLiteral &&
					path.fieldCount(Field.expressions, property) === 0 &&
					typeof (
						/** @type {{ cooked?: unknown }} */ (
							path.value(path.field(0, Field.quasis, property))
						).cooked
					) === "string"
				)
			) {
				break;
			}
		} else if (type !== NodeType.Identifier) {
			break;
		}
		root = path.field(0, Field.object, root);
	}
	if (path.type(root) !== NodeType.Identifier) return false;
	const name = path.name(root);
	return name !== "undefined" && parser._isDefinedPlainVariable(name);
};

/**
 * Walks chains of unknown locals without evaluating every prefix.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the chain's nodes
 * @param {number} expression the logical chain
 * @returns {boolean} whether the entire expression was walked
 */
const walkUnknownLocalChain = (parser, path, expression) => {
	if (
		path.type(path.field(0, Field.left, expression)) !==
		NodeType.LogicalExpression
	) {
		return false;
	}
	const logicalHook = parser.hooks.expressionLogicalOperator;
	if (logicalHook.interceptors.length !== 0 || logicalHook.taps.length !== 1) {
		return false;
	}
	for (const type of ["Identifier", "MemberExpression", "LogicalExpression"]) {
		const hook = parser.hooks.evaluate.get(type);
		if (
			hook &&
			(hook.interceptors.length !== 0 ||
				hook.taps.some(
					(tap) =>
						tap.name !== "JavascriptParser" &&
						// ImportMetaPlugin only evaluates members rooted at import.meta.
						!(type === "MemberExpression" && tap.name === "ImportMetaPlugin")
				))
		) {
			return false;
		}
	}
	const operator = path.textOf(Part.operator, expression);
	/** @type {number[]} */
	const rightOperands = [];
	let current = expression;
	while (path.type(current) === NodeType.LogicalExpression) {
		const right = path.field(0, Field.right, current);
		if (
			path.textOf(Part.operator, current) !== operator ||
			!isUnknownLocal(parser, path, right)
		) {
			return false;
		}
		rightOperands.push(right);
		current = path.field(0, Field.left, current);
	}
	if (!isUnknownLocal(parser, path, current)) return false;
	// All prefix evaluations precede the first operand walk. Keep that order:
	// walking an operand may change the parser's bindings or plugin state.
	parser.walkExpression(parser.nodeOfPath(path, current));
	for (let index = rightOperands.length - 1; index >= 0; index--) {
		parser.walkExpression(parser.nodeOfPath(path, rightOperands[index]));
	}
	return true;
};

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
					// these taps see every statement, `if` and conditional, so they read
					// ids and make objects only for a branch they remove
					parser.hooks.terminate.tap(
						{ name: PLUGIN_NAME, path: true },
						() => true
					);
					parser.hooks.statementIf.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							if (parser.scope.isAsmJs) return;
							const test = parser.nodeOfPath(
								path,
								path.field(0, Field.test, statement)
							);
							const param = parser.evaluateExpression(test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(
										`${bool}`,
										/** @type {Range} */ (param.range)
									);
									dep.loc = parser.getLocation(
										parser.nodeOfPath(path, statement)
									);
									parser.state.module.addPresentationalDependency(dep);
								} else {
									parser.walkExpression(test);
								}
								const branchToRemove = path.field(
									0,
									bool ? Field.alternate : Field.consequent,
									statement
								);
								if (branchToRemove !== 0) {
									this.eliminateUnusedStatement(
										parser,
										/** @type {Statement} */ (path.object(branchToRemove)),
										true
									);
								}
								return bool;
							}
						}
					);
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
						{ name: PLUGIN_NAME, path: true },
						(path, expression) => {
							if (parser.scope.isAsmJs) return;
							const test = parser.nodeOfPath(
								path,
								path.field(0, Field.test, expression)
							);
							const param = parser.evaluateExpression(test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(
										` ${bool}`,
										/** @type {Range} */ (param.range)
									);
									dep.loc = parser.getLocation(
										parser.nodeOfPath(path, expression)
									);
									parser.state.module.addPresentationalDependency(dep);
								} else {
									parser.walkExpression(test);
								}
								// Expressions do not hoist, so the dead branch is safe to remove:
								// `false ? someExpression() : other()` becomes `false ? 0 : other()`.
								const branchToRemove = path.field(
									0,
									bool ? Field.alternate : Field.consequent,
									expression
								);
								const dep = new ConstDependency(
									"0",
									path.range(branchToRemove)
								);
								dep.loc = parser.getLocation(
									parser.nodeOfPath(path, branchToRemove)
								);
								parser.state.module.addPresentationalDependency(dep);
								return bool;
							}
						}
					);
					parser.hooks.expressionLogicalOperator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression) => {
							if (parser.scope.isAsmJs) return;
							const operator = path.textOf(Part.operator, expression);
							const leftNode = path.field(0, Field.left, expression);
							const left = parser.nodeOfPath(path, leftNode);
							const rightRange = path.range(
								path.field(0, Field.right, expression)
							);
							if (operator === "&&" || operator === "||") {
								// a chain starts with a logical expression on the left
								if (walkUnknownLocalChain(parser, path, expression)) {
									return false;
								}
								const param = parser.evaluateExpression(left);
								const bool = param.asBool();
								if (typeof bool === "boolean") {
									// Expressions do not hoist, so the dead branch is safe to remove.
									// Whichever side cannot decide the result is replaced, leaving the
									// deciding side and its side effects in place.
									const keepRight =
										(operator === "&&" && bool) || (operator === "||" && !bool);

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
										dep.loc = parser.getLocation(
											parser.nodeOfPath(path, expression)
										);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										parser.walkExpression(left);
									}
									if (!keepRight) {
										const dep = new ConstDependency("0", rightRange);
										dep.loc = parser.getLocation(
											parser.nodeOfPath(path, expression)
										);
										parser.state.module.addPresentationalDependency(dep);
									}
									return keepRight;
								}
							} else if (operator === "??") {
								const param = parser.evaluateExpression(left);
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
										dep.loc = parser.getLocation(
											parser.nodeOfPath(path, expression)
										);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										const dep = new ConstDependency("0", rightRange);
										dep.loc = parser.getLocation(
											parser.nodeOfPath(path, expression)
										);
										parser.state.module.addPresentationalDependency(dep);
										parser.walkExpression(left);
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
