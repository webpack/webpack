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
const memoize = require("../util/memoize");

/**
 * @import {
 * 	Identifier,
 * 	LogicalExpression,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import Compiler from "../Compiler" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */
/** @import { JavascriptNodeReader } from "./syntax" */
/** @import { DependencyLocation } from "../graph/Dependency" */

/** @typedef {Set<string>} Declarations */

const getSyntaxParser = memoize(() => require("./syntax").parser);

/**
 * Collect declaration.
 * @param {JavascriptNodeReader} path what the pattern is read through
 * @param {Declarations} declarations set of declarations
 * @param {number} pattern pattern to collect declarations from
 */
const collectDeclaration = (path, declarations, pattern) => {
	const { Field, NodeType } = getSyntaxParser();
	const stack = [pattern];
	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		switch (path.type(node)) {
			case NodeType.Identifier:
				declarations.add(path.name(node));
				break;
			case NodeType.ArrayPattern:
				for (
					let index = 0, count = path.fieldCount(Field.elements, node);
					index < count;
					index++
				) {
					const element = path.field(index, Field.elements, node);
					if (element !== 0) stack.push(element);
				}
				break;
			case NodeType.AssignmentPattern:
				stack.push(path.field(0, Field.left, node));
				break;
			case NodeType.ObjectPattern:
				for (
					let index = 0, count = path.fieldCount(Field.properties, node);
					index < count;
					index++
				) {
					const property = path.field(index, Field.properties, node);
					stack.push(
						path.type(property) === NodeType.RestElement
							? path.field(0, Field.argument, property)
							: path.field(0, Field.value, property)
					);
				}
				break;
			case NodeType.RestElement:
				stack.push(path.field(0, Field.argument, node));
				break;
		}
	}
};

/**
 * Gets hoisted declarations.
 * @param {JavascriptNodeReader} path what the branch is read through
 * @param {number} branch branch to get hoisted declarations from
 * @param {boolean} includeFunctionDeclarations whether to include function declarations
 * @returns {string[]} hoisted declarations
 */
const getHoistedDeclarations = (path, branch, includeFunctionDeclarations) => {
	const { Field, NodeType, Part } = getSyntaxParser();
	/** @type {Declarations} */
	const declarations = new Set();
	/**
	 * @param {number} node the node holding the list
	 * @param {number} field the list's field
	 * @param {number[]} stack the nodes still to read
	 */
	const pushAll = (node, field, stack) => {
		for (
			let index = 0, count = path.fieldCount(field, node);
			index < count;
			index++
		) {
			stack.push(path.field(index, field, node));
		}
	};
	/** @type {number[]} */
	const stack = [branch];
	while (stack.length > 0) {
		const node = /** @type {number} */ (stack.pop());
		// A missing branch, init or finalizer is node 0.
		if (node === 0) continue;
		switch (path.type(node)) {
			// Walk through control statements to look for hoisted declarations.
			// Some branches are skipped since they do not allow declarations.
			case NodeType.BlockStatement:
				pushAll(node, Field.body, stack);
				break;
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
			case NodeType.SwitchStatement:
				for (
					let index = 0, count = path.fieldCount(Field.cases, node);
					index < count;
					index++
				) {
					pushAll(
						path.field(index, Field.cases, node),
						Field.consequent,
						stack
					);
				}
				break;
			case NodeType.TryStatement: {
				stack.push(path.field(0, Field.block, node));
				const handler = path.field(0, Field.handler, node);
				if (handler !== 0) stack.push(path.field(0, Field.body, handler));
				stack.push(path.field(0, Field.finalizer, node));
				break;
			}
			case NodeType.FunctionDeclaration:
				if (includeFunctionDeclarations) {
					collectDeclaration(path, declarations, path.field(0, Field.id, node));
				}
				break;
			case NodeType.VariableDeclaration:
				if (path.textOf(Part.kind, node) === "var") {
					for (
						let index = 0, count = path.fieldCount(Field.declarations, node);
						index < count;
						index++
					) {
						collectDeclaration(
							path,
							declarations,
							path.field(
								0,
								Field.id,
								path.field(index, Field.declarations, node)
							)
						);
					}
				}
				break;
		}
	}
	return [...declarations];
};

const PLUGIN_NAME = "ConstPlugin";

/**
 * The root a member chain names, as `getMemberExpressionRoot` finds it.
 * @param {JavascriptNodeReader} path what the chain is read through
 * @param {number} node the expression
 * @returns {number} the root of the chain
 */
const memberRootOf = (path, node) => {
	const { Field, Flag, NodeType } = getSyntaxParser();
	while (path.type(node) === NodeType.MemberExpression) {
		const property = path.field(0, Field.property, node);
		const type = path.type(property);
		if (path.flag(Flag.computed, node)) {
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
		node = path.field(0, Field.object, node);
	}
	return node;
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path what the operand is read through
 * @param {number} node the operand
 * @returns {boolean} whether the built-in evaluator cannot resolve the operand
 */
const isUnknownLocal = (parser, path, node) => {
	const { NodeType } = getSyntaxParser();
	const root = memberRootOf(path, node);
	return (
		path.type(root) === NodeType.Identifier &&
		path.name(root) !== "undefined" &&
		parser._isDefinedPlainVariable(path.name(root))
	);
};

/**
 * Walks chains of unknown locals without evaluating every prefix.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path what the chain is read through
 * @param {number} expression the logical chain
 * @returns {boolean} whether the entire expression was walked
 */
const walkUnknownLocalChain = (parser, path, expression) => {
	const { Field, NodeType, Part } = getSyntaxParser();
	if (
		path.type(path.field(0, Field.left, expression)) !==
		NodeType.LogicalExpression
	) {
		return false;
	}
	const { ownInterceptorsOnly } =
		/** @type {typeof JavascriptParser} */
		(parser.constructor);
	const logicalHook = parser.hooks.expressionLogicalOperator;
	if (!ownInterceptorsOnly(logicalHook) || logicalHook.taps.length !== 1) {
		return false;
	}
	for (const type of ["Identifier", "MemberExpression", "LogicalExpression"]) {
		const hook = parser.hooks.evaluate.get(type);
		if (
			hook &&
			(!ownInterceptorsOnly(hook) ||
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
	parser.walkExpression(current);
	for (let index = rightOperands.length - 1; index >= 0; index--) {
		parser.walkExpression(rightOperands[index]);
	}
	return true;
};

/**
 * The location of a node read through the path.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path what the node is read through
 * @param {number} node the node
 * @returns {DependencyLocation} its location
 */
const locationOf = (parser, path, node) =>
	parser.getLocation({ start: path.start(node), end: path.end(node) });

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
					parser.hooks.terminate.tap(
						{ name: PLUGIN_NAME, path: true },
						() => true
					);
					parser.hooks.statementIf.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							if (parser.scope.isAsmJs) return;
							const { Field } = getSyntaxParser();
							const test = path.field(0, Field.test, statement);
							const param = parser.evaluateExpression(test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(
										`${bool}`,
										/** @type {Range} */ (param.range)
									);
									dep.loc = locationOf(parser, path, statement);
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
							this.eliminateUnusedStatement(parser, path, statement, false);
							return true;
						}
					);
					parser.hooks.expressionConditionalOperator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression) => {
							if (parser.scope.isAsmJs) return;
							const { Field } = getSyntaxParser();
							const test = path.field(0, Field.test, expression);
							const param = parser.evaluateExpression(test);
							const bool = param.asBool();
							if (typeof bool === "boolean") {
								if (!param.couldHaveSideEffects()) {
									const dep = new ConstDependency(
										` ${bool}`,
										/** @type {Range} */ (param.range)
									);
									dep.loc = locationOf(parser, path, expression);
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
								const dep = new ConstDependency("0", [
									path.start(branchToRemove),
									path.end(branchToRemove)
								]);
								dep.loc = locationOf(parser, path, branchToRemove);
								parser.state.module.addPresentationalDependency(dep);
								return bool;
							}
						}
					);
					parser.hooks.expressionLogicalOperator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression) => {
							if (parser.scope.isAsmJs) return;
							const { Field, Part } = getSyntaxParser();
							const operator = path.textOf(Part.operator, expression);
							const left = path.field(0, Field.left, expression);
							const right = path.field(0, Field.right, expression);
							if (operator === "&&" || operator === "||") {
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
										dep.loc = locationOf(parser, path, expression);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										parser.walkExpression(left);
									}
									if (!keepRight) {
										const dep = new ConstDependency("0", [
											path.start(right),
											path.end(right)
										]);
										dep.loc = locationOf(parser, path, expression);
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
										dep.loc = locationOf(parser, path, expression);
										parser.state.module.addPresentationalDependency(dep);
									} else {
										const dep = new ConstDependency("0", [
											path.start(right),
											path.end(right)
										]);
										dep.loc = locationOf(parser, path, expression);
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
						(path, chain) => {
							const { Field, Flag, NodeType } = getSyntaxParser();
							/** @type {number[]} */
							const optionalExpressionsStack = [];
							let next = path.field(0, Field.expression, chain);
							for (;;) {
								const type = path.type(next);
								/** @type {number} */
								let field;
								if (type === NodeType.MemberExpression) field = Field.object;
								else if (type === NodeType.CallExpression) field = Field.callee;
								else break;
								const inner = path.field(0, field, next);
								// SuperNode can not be optional
								if (path.flag(Flag.optional, next)) {
									optionalExpressionsStack.push(inner);
								}
								next = inner;
							}

							while (optionalExpressionsStack.length) {
								const evaluated = parser.evaluateExpression(
									/** @type {number} */ (optionalExpressionsStack.pop())
								);

								if (evaluated.asNullish()) {
									// A nullish chain short-circuits whole, so `nullish?.a.b()`
									// becomes `undefined`.
									const dep = new ConstDependency(" undefined", [
										path.start(chain),
										path.end(chain)
									]);
									dep.loc = locationOf(parser, path, chain);
									parser.state.module.addPresentationalDependency(dep);
									return true;
								}
							}
						}
					);
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
	 * @param {JavascriptNodeReader} path what the statement is read through
	 * @param {number} statement the statement to remove
	 * @param {boolean} alwaysInBlock whether to always generate curly brackets
	 * @returns {void}
	 */
	eliminateUnusedStatement(parser, path, statement, alwaysInBlock) {
		// The hoisted declarations must be collected before the unused branch goes,
		// since the removed code still contributes them. In strict mode `var` is
		// hoisted but `function` is not, so the two modes collect different sets.
		const declarations = getHoistedDeclarations(
			path,
			statement,
			!parser.scope.isStrict
		);

		const inBlock =
			alwaysInBlock ||
			path.type(statement) === getSyntaxParser().NodeType.BlockStatement;

		let replacement = inBlock ? "{" : "";
		replacement +=
			declarations.length > 0 ? ` var ${declarations.join(", ")}; ` : "";
		replacement += inBlock ? "}" : "";

		const dep = new ConstDependency(
			`// removed by dead control flow\n${replacement}`,
			[path.start(statement), path.end(statement)]
		);
		dep.loc = locationOf(parser, path, statement);
		parser.state.module.addPresentationalDependency(dep);
	}
}

module.exports = ConstPlugin;
