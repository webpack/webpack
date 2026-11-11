/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedConstDependency = require("../dependencies/core/CachedConstDependency");
const ConstDependency = require("../dependencies/core/ConstDependency");
const {
	evaluateToStringByPath
} = require("../javascript/JavascriptParserHelpers");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { parseResource } = require("../util/identifier");
const { Field, Flag, NodeType, Part } = require("./syntax-parser");

/**
 * @import {
 * 	Identifier,
 * 	LogicalExpression,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import Compiler from "../Compiler" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "../javascript/JavascriptParser" */

/** @typedef {Set<string>} Declarations */

/**
 * Collects the names a pattern declares, read by id.
 * @param {JavascriptNodeReader} path the reader
 * @param {Declarations} declarations set of declarations
 * @param {number} pattern the pattern to collect declarations from
 */
const collectDeclarationByPath = (path, declarations, pattern) => {
	const stack = [pattern];
	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		switch (path.type(node)) {
			case NodeType.Identifier:
				declarations.add(path.name(node));
				break;
			case NodeType.ArrayPattern: {
				const count = path.fieldCount(Field.elements, node);
				for (let i = 0; i < count; i++) {
					const element = path.field(i, Field.elements, node);
					if (element !== 0) stack.push(element);
				}
				break;
			}
			case NodeType.AssignmentPattern:
				stack.push(path.field(0, Field.left, node));
				break;
			case NodeType.ObjectPattern: {
				const count = path.fieldCount(Field.properties, node);
				for (let i = 0; i < count; i++) {
					const property = path.field(i, Field.properties, node);
					stack.push(
						path.type(property) === NodeType.RestElement
							? property
							: path.field(0, Field.value, property)
					);
				}
				break;
			}
			case NodeType.RestElement:
				stack.push(path.field(0, Field.argument, node));
				break;
		}
	}
};

/**
 * Gets the declarations a statement hoists, read by id.
 * @param {JavascriptNodeReader} path the reader
 * @param {number} branch branch to get hoisted declarations from
 * @param {boolean} includeFunctionDeclarations whether to include function declarations
 * @returns {string[]} hoisted declarations
 */
const getHoistedDeclarationsByPath = (
	path,
	branch,
	includeFunctionDeclarations
) => {
	/** @type {Declarations} */
	const declarations = new Set();
	const stack = [branch];
	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		if (node === 0) continue;
		switch (path.type(node)) {
			case NodeType.BlockStatement: {
				const count = path.fieldCount(Field.body, node);
				for (let i = 0; i < count; i++) {
					stack.push(path.field(i, Field.body, node));
				}
				break;
			}
			case NodeType.IfStatement:
				stack.push(path.field(0, Field.consequent, node));
				stack.push(path.field(0, Field.alternate, node));
				break;
			case NodeType.ForStatement:
				stack.push(path.field(0, Field.init, node));
				stack.push(path.field(0, Field.body, node));
				break;
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				stack.push(path.field(0, Field.left, node));
				stack.push(path.field(0, Field.body, node));
				break;
			case NodeType.DoWhileStatement:
			case NodeType.WhileStatement:
			case NodeType.LabeledStatement:
				stack.push(path.field(0, Field.body, node));
				break;
			case NodeType.SwitchStatement: {
				const count = path.fieldCount(Field.cases, node);
				for (let i = 0; i < count; i++) {
					const switchCase = path.field(i, Field.cases, node);
					const consequentCount = path.fieldCount(Field.consequent, switchCase);
					for (let j = 0; j < consequentCount; j++) {
						stack.push(path.field(j, Field.consequent, switchCase));
					}
				}
				break;
			}
			case NodeType.TryStatement: {
				stack.push(path.field(0, Field.block, node));
				const handler = path.field(0, Field.handler, node);
				if (handler !== 0) stack.push(path.field(0, Field.body, handler));
				stack.push(path.field(0, Field.finalizer, node));
				break;
			}
			case NodeType.FunctionDeclaration:
				if (includeFunctionDeclarations) {
					collectDeclarationByPath(
						path,
						declarations,
						path.field(0, Field.id, node)
					);
				}
				break;
			case NodeType.VariableDeclaration:
				if (path.textOf(Part.kind, node) === "var") {
					const count = path.fieldCount(Field.declarations, node);
					for (let i = 0; i < count; i++) {
						collectDeclarationByPath(
							path,
							declarations,
							path.field(0, Field.id, path.field(i, Field.declarations, node))
						);
					}
				}
				break;
		}
	}
	return [...declarations];
};

/**
 * Eliminates an unused statement, read by id.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader
 * @param {number} statement the statement to remove
 * @param {boolean} alwaysInBlock whether to always generate curly brackets
 * @returns {void}
 */
const eliminateUnusedStatementByPath = (
	parser,
	path,
	statement,
	alwaysInBlock
) => {
	// strict mode hoists `var` but not `function`
	const declarations = getHoistedDeclarationsByPath(
		path,
		statement,
		!parser.scope.isStrict
	);
	const inBlock =
		alwaysInBlock || path.type(statement) === NodeType.BlockStatement;

	let replacement = inBlock ? "{" : "";
	replacement +=
		declarations.length > 0 ? ` var ${declarations.join(", ")}; ` : "";
	replacement += inBlock ? "}" : "";

	const dep = new ConstDependency(
		`// removed by dead control flow\n${replacement}`,
		path.range(statement)
	);
	dep.loc = parser.getLocation(parser.nodeOfPath(path, statement));
	parser.state.module.addPresentationalDependency(dep);
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
						/** @type {{ cooked?: string | null }} */ (
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
									eliminateUnusedStatementByPath(
										parser,
										path,
										branchToRemove,
										true
									);
								}
								return bool;
							}
						}
					);
					parser.hooks.unusedStatement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							if (
								parser.scope.isAsmJs ||
								// Check top level scope here again
								parser.scope.topLevelScope === true
							) {
								return;
							}
							eliminateUnusedStatementByPath(parser, path, statement, false);
							return true;
						}
					);
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
					parser.hooks.optionalChaining.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expr) => {
							/** @type {number[]} */
							const optionalExpressionsStack = [];
							let next = path.field(0, Field.expression, expr);
							let type = path.type(next);

							while (
								type === NodeType.MemberExpression ||
								type === NodeType.CallExpression
							) {
								// SuperNode can not be optional
								const inner = path.field(
									0,
									type === NodeType.MemberExpression
										? Field.object
										: Field.callee,
									next
								);
								if (path.flag(Flag.optional, next)) {
									optionalExpressionsStack.push(inner);
								}
								next = inner;
								type = path.type(next);
							}

							while (optionalExpressionsStack.length) {
								const expression = /** @type {number} */ (
									optionalExpressionsStack.pop()
								);
								const evaluated = parser.evaluateExpression(
									parser.nodeOfPath(path, expression)
								);

								if (evaluated.asNullish()) {
									// A nullish chain short-circuits whole, so `nullish?.a.b()`
									// becomes `undefined`.
									const dep = new ConstDependency(
										" undefined",
										path.range(expr)
									);
									dep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
									parser.state.module.addPresentationalDependency(dep);
									return true;
								}
							}
						}
					);
					parser.hooks.evaluateIdentifier
						.for("__resourceQuery")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToStringByPath(
								cachedParseResource(parser.state.module.resource).query
							)(path, node);
						});
					parser.hooks.expression
						.for("__resourceQuery")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).query
								),
								path.range(node),
								"__resourceQuery"
							);
							dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					parser.hooks.evaluateIdentifier
						.for("__resourceFragment")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							return evaluateToStringByPath(
								cachedParseResource(parser.state.module.resource).fragment
							)(path, node);
						});
					parser.hooks.expression
						.for("__resourceFragment")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							if (parser.scope.isAsmJs) return;
							if (!parser.state.module) return;
							const dep = new CachedConstDependency(
								JSON.stringify(
									cachedParseResource(parser.state.module.resource).fragment
								),
								path.range(node),
								"__resourceFragment"
							);
							dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
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
