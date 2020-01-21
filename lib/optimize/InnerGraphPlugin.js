/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	harmonySpecifierTag
} = require("../dependencies/HarmonyImportDependencyParserPlugin");
const PureExpressionDependency = require("../dependencies/PureExpressionDependency");
const InnerGraph = require("./InnerGraph");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../dependencies/HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InnerGraph").InnerGraph} InnerGraph */
/** @typedef {import("./InnerGraph").TopLevelSymbol} TopLevelSymbol */

const { TopLevelSymbol, topLevelSymbolTag } = InnerGraph;

/**
 * @param {any} expr an expression
 * @param {JavascriptParser} parser the parser
 * @param {number} commentsStartPos source position from which annotation comments are checked
 * @returns {boolean} true, when the expression is pure
 */
const isPure = (expr, parser, commentsStartPos) => {
	switch (expr.type) {
		case "Identifier":
			return (
				parser.isVariableDefined(expr.name) ||
				parser.getTagData(expr.name, harmonySpecifierTag)
			);

		case "ClassExpression":
			if (expr.body.type !== "ClassBody") return false;
			if (expr.superClass && !isPure(expr.superClass, parser, expr.range[0])) {
				return false;
			}
			return expr.body.body.every(item => {
				switch (item.type) {
					case "ClassProperty":
						// TODO add test case once acorn supports it
						// Currently this is not parsable
						if (item.static) return isPure(item.value, parser, item.range[0]);
						break;
				}
				return true;
			});

		case "FunctionExpression":
		case "ArrowFunctionExpression":
		case "Literal":
			return true;

		case "ConditionalExpression":
			return (
				isPure(expr.test, parser, commentsStartPos) &&
				isPure(expr.consequent, parser, expr.test.range[1]) &&
				isPure(expr.alternate, parser, expr.consequent.range[1])
			);

		case "SequenceExpression":
			return expr.expressions.every(expr => {
				const pureFlag = isPure(expr, parser, commentsStartPos);
				commentsStartPos = expr.range[1];
				return pureFlag;
			});

		case "CallExpression": {
			const pureFlag =
				expr.range[0] - commentsStartPos > 12 &&
				parser
					.getComments([commentsStartPos, expr.range[0]])
					.some(
						comment =>
							comment.type === "Block" &&
							/^\s*(#|@)__PURE__\s*$/.test(comment.value)
					);
			if (!pureFlag) return false;
			commentsStartPos = expr.callee.range[1];
			return expr.arguments.every(arg => {
				if (arg.type === "SpreadElement") return false;
				const pureFlag = isPure(arg, parser, commentsStartPos);
				commentsStartPos = arg.range[1];
				return pureFlag;
			});
		}
	}
	return false;
};

class InnerGraphPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"InnerGraphPlugin",
			(compilation, { normalModuleFactory }) => {
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
					parser.hooks.program.tap("InnerGraphPlugin", () => {
						InnerGraph.enable(parser.state);
					});

					parser.hooks.finish.tap("InnerGraphPlugin", () => {
						const innerGraphState = InnerGraph.getState(parser.state);
						if (!innerGraphState) return;

						const {
							innerGraph,
							allExportDependentDependencies
						} = innerGraphState;
						// flatten graph to terminal nodes (string, undefined or true)
						const nonTerminal = new Set(innerGraph.keys());
						while (nonTerminal.size > 0) {
							for (const key of nonTerminal) {
								/** @type {Set<string|TopLevelSymbol> | true} */
								let newSet = new Set();
								let isTerminal = true;
								const value = innerGraph.get(key);
								if (value !== true && value !== undefined) {
									for (const item of value) {
										if (typeof item === "string") {
											newSet.add(item);
										} else {
											const itemValue = innerGraph.get(item);
											if (itemValue === true) {
												newSet = true;
												break;
											}
											if (itemValue !== undefined) {
												for (const i of itemValue) {
													if (i === key) continue;
													if (value.has(i)) continue;
													newSet.add(i);
													if (typeof i !== "string") {
														isTerminal = false;
													}
												}
											}
										}
									}
									if (newSet === true) {
										innerGraph.set(key, true);
									} else if (newSet.size === 0) {
										innerGraph.set(key, undefined);
									} else {
										innerGraph.set(key, newSet);
									}
								}
								if (isTerminal) {
									nonTerminal.delete(key);
								}
							}
						}

						for (const dep of allExportDependentDependencies) {
							const value = innerGraph.get(dep);
							switch (value) {
								case undefined:
									dep.usedByExports = false;
									break;
								case true:
									dep.usedByExports = true;
									break;
								default:
									dep.usedByExports = /** @type {Set<string>} */ (value);
									break;
							}
						}
					});
					/** @type {WeakMap<{}, TopLevelSymbol>} */
					const statementWithTopLevelSymbol = new WeakMap();
					parser.hooks.preStatement.tap("InnerGraphPlugin", statement => {
						const innerGraphState = InnerGraph.getState(parser.state);
						if (!innerGraphState) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "FunctionDeclaration") {
								const { innerGraph } = innerGraphState;
								const name = statement.id ? statement.id.name : "*default*";
								parser.defineVariable(name);
								const fn = new TopLevelSymbol(name, innerGraph);
								parser.tagVariable(name, topLevelSymbolTag, fn);
								statementWithTopLevelSymbol.set(statement, fn);
								return true;
							}
						}
					});
					parser.hooks.blockPreStatement.tap("InnerGraphPlugin", statement => {
						const innerGraphState = InnerGraph.getState(parser.state);
						if (!innerGraphState) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "ClassDeclaration") {
								const { innerGraph } = innerGraphState;
								const name = statement.id ? statement.id.name : "*default*";
								parser.defineVariable(name);
								const fn = new TopLevelSymbol(name, innerGraph);
								parser.tagVariable(name, topLevelSymbolTag, fn);
								statementWithTopLevelSymbol.set(statement, fn);
								return true;
							}
							if (statement.type === "ExportDefaultDeclaration") {
								const decl = statement.declaration;
								if (
									decl.type === "FunctionExpression" ||
									decl.type === "ArrowFunctionExpression" ||
									decl.type === "ClassExpression" ||
									decl.type === "Identifier"
								) {
									const { innerGraph } = innerGraphState;
									const name = "*default*";
									parser.defineVariable(name);
									const fn = new TopLevelSymbol(name, innerGraph);
									parser.tagVariable(name, topLevelSymbolTag, fn);
									statementWithTopLevelSymbol.set(statement, fn);
								}
							}
						}
					});
					const tagVar = (innerGraphState, name) => {
						const { innerGraph } = innerGraphState;
						parser.defineVariable(name);
						const existingTag = parser.getTagData(name, topLevelSymbolTag);
						const fn = existingTag || new TopLevelSymbol(name, innerGraph);
						if (!existingTag) {
							parser.tagVariable(name, topLevelSymbolTag, fn);
						}
						return fn;
					};
					/** @type {WeakMap<{}, TopLevelSymbol>} */
					const declWithTopLevelSymbol = new WeakMap();
					const pureDeclarators = new WeakSet();
					parser.hooks.preDeclarator.tap(
						"InnerGraphPlugin",
						(decl, statement) => {
							const innerGraphState = InnerGraph.getState(parser.state);
							if (!innerGraphState) return;
							if (
								parser.scope.topLevelScope === true &&
								decl.init &&
								decl.id.type === "Identifier"
							) {
								if (
									decl.init.type === "FunctionExpression" ||
									decl.init.type === "ArrowFunctionExpression" ||
									decl.init.type === "ClassExpression"
								) {
									const name = decl.id.name;
									const fn = tagVar(innerGraphState, name);
									declWithTopLevelSymbol.set(decl, fn);
									return true;
								}
								if (isPure(decl.init, parser, decl.id.range[1])) {
									const name = decl.id.name;
									const fn = tagVar(innerGraphState, name);
									declWithTopLevelSymbol.set(decl, fn);
									pureDeclarators.add(decl);
									return true;
								}
							}
						}
					);
					parser.hooks.statement.tap("InnerGraphPlugin", statement => {
						const innerGraphState = InnerGraph.getState(parser.state);
						if (!innerGraphState) return;
						if (parser.scope.topLevelScope === true) {
							innerGraphState.currentTopLevelSymbol = undefined;
							const fn = statementWithTopLevelSymbol.get(statement);
							if (fn) {
								innerGraphState.currentTopLevelSymbol = fn;
							}
						}
					});
					parser.hooks.declarator.tap("InnerGraphPlugin", (decl, statement) => {
						const innerGraphState = InnerGraph.getState(parser.state);
						if (!innerGraphState) return;
						const {
							innerGraph,
							allExportDependentDependencies
						} = innerGraphState;
						const fn = declWithTopLevelSymbol.get(decl);
						if (fn) {
							if (pureDeclarators.has(decl)) {
								const dep = new PureExpressionDependency(decl.init.range);
								dep.loc = decl.loc;
								parser.state.module.addDependency(dep);
								innerGraph.set(dep, new Set([fn]));
								allExportDependentDependencies.add(dep);
							}
							innerGraphState.currentTopLevelSymbol = fn;
							parser.walkExpression(decl.init);
							innerGraphState.currentTopLevelSymbol = undefined;
							return true;
						}
					});
					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap("InnerGraphPlugin", expr => {
							const innerGraphState = InnerGraph.getState(parser.state);
							if (!innerGraphState) return;
							const topLevelSymbol =
								/** @type {TopLevelSymbol} */ (parser.currentTagData);
							const { currentTopLevelSymbol } = innerGraphState;
							topLevelSymbol.addDependency(currentTopLevelSymbol || true);
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
			}
		);
	}
}

module.exports = InnerGraphPlugin;
