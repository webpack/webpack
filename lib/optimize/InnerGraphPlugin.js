/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	harmonySpecifierTag
} = require("../dependencies/HarmonyImportDependencyParserPlugin");
const PureExpressionDependency = require("../dependencies/PureExpressionDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const topLevelSymbolTag = Symbol("top level symbol");

/** @typedef {Map<TopLevelSymbol | Dependency, Set<string | TopLevelSymbol> | true>} InnerGraph */

/**
 * @param {any} expr an expression
 * @param {JavascriptParser} parser the parser
 * @returns {boolean} true, when the expression is pure
 */
const isPure = (expr, parser) => {
	switch (expr.type) {
		case "Identifier":
			return (
				parser.isVariableDefined(expr.name) ||
				parser.getTagData(expr.name, harmonySpecifierTag)
			);
		case "Literal":
			return true;
		case "ConditionalExpression":
			return (
				isPure(expr.test, parser) &&
				isPure(expr.consequent, parser) &&
				isPure(expr.alternate, parser)
			);
	}
	return false;
};

class TopLevelSymbol {
	/**
	 * @param {string} name name of the function
	 * @param {InnerGraph} innerGraph reference to the graph
	 */
	constructor(name, innerGraph) {
		this.name = name;
		this.innerGraph = innerGraph;
	}

	/**
	 * @param {string | TopLevelSymbol | true} dep export or top level symbol or always
	 * @returns {void}
	 */
	addDependency(dep) {
		const info = this.innerGraph.get(this);
		if (dep === true) {
			this.innerGraph.set(this, true);
		} else if (info === undefined) {
			this.innerGraph.set(this, new Set([dep]));
		} else if (info !== true) {
			info.add(dep);
		}
	}
}

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
						parser.state.harmonyInnerGraph = new Map();
						parser.state.harmonyAllExportDependentDependencies = new Set();
					});

					parser.hooks.finish.tap("InnerGraphPlugin", () => {
						if (parser.state.module.buildInfo.usingEval) return;
						const innerGraph =
							/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
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

						for (const dep of parser.state
							.harmonyAllExportDependentDependencies) {
							const value = innerGraph.get(dep);
							switch (value) {
								case undefined:
									dep.usedByExports = false;
									break;
								case true:
									dep.usedByExports = true;
									break;
								default:
									dep.usedByExports = value;
									break;
							}
						}
					});
					/** @type {WeakMap<{}, TopLevelSymbol>} */
					const statementWithTopLevelSymbol = new WeakMap();
					parser.hooks.preStatement.tap("InnerGraphPlugin", statement => {
						if (parser.scope.topLevelScope === true) {
							if (statement.type === "FunctionDeclaration") {
								const innerGraph =
									/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
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
						if (parser.scope.topLevelScope === true) {
							if (statement.type === "ClassDeclaration") {
								const innerGraph =
									/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
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
									const innerGraph =
										/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
									const name = "*default*";
									parser.defineVariable(name);
									const fn = new TopLevelSymbol(name, innerGraph);
									parser.tagVariable(name, topLevelSymbolTag, fn);
									statementWithTopLevelSymbol.set(statement, fn);
								}
							}
						}
					});
					const tagVar = name => {
						const innerGraph =
							/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
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
									const fn = tagVar(name);
									declWithTopLevelSymbol.set(decl, fn);
									return true;
								}
								if (
									(decl.init.range[0] - decl.id.range[1] > 9 &&
										parser
											.getComments([decl.id.range[1], decl.init.range[0]])
											.some(
												comment =>
													comment.type === "Block" &&
													/^\s*(#|@)__PURE__\s*$/.test(comment.value)
											)) ||
									isPure(decl.init, parser)
								) {
									const name = decl.id.name;
									const fn = tagVar(name);
									declWithTopLevelSymbol.set(decl, fn);
									pureDeclarators.add(decl);
									return true;
								}
							}
						}
					);
					parser.hooks.statement.tap("InnerGraphPlugin", statement => {
						if (parser.scope.topLevelScope === true) {
							parser.state.currentTopLevelSymbol = undefined;
							const fn = statementWithTopLevelSymbol.get(statement);
							if (fn) {
								parser.state.currentTopLevelSymbol = fn;
							}
						}
					});
					parser.hooks.declarator.tap("InnerGraphPlugin", (decl, statement) => {
						const fn = declWithTopLevelSymbol.get(decl);
						if (fn) {
							if (pureDeclarators.has(decl)) {
								const innerGraph =
									/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
								const dep = new PureExpressionDependency(decl.init.range);
								dep.loc = decl.loc;
								parser.state.module.addDependency(dep);
								innerGraph.set(dep, new Set([fn]));
								parser.state.harmonyAllExportDependentDependencies.add(dep);
							}
							parser.state.currentTopLevelSymbol = fn;
							parser.walkExpression(decl.init);
							parser.state.currentTopLevelSymbol = undefined;
							return true;
						}
					});
					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap("InnerGraphPlugin", expr => {
							const topLevelSymbol =
								/** @type {TopLevelSymbol} */ (parser.currentTagData);
							const currentTopLevelSymbol = parser.state.currentTopLevelSymbol;
							topLevelSymbol.addDependency(currentTopLevelSymbol || true);
						});
					parser.hooks.assign
						.for(topLevelSymbolTag)
						.tap("InnerGraphPlugin", expr => {
							if (expr.operator === "=") return true;
						});
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("InnerGraphPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("InnerGraphPlugin", handler);

				compilation.hooks.optimizeDependencies.tap(
					"InnerGraphPlugin",
					modules => {}
				);
			}
		);
	}
}

module.exports = InnerGraphPlugin;
module.exports.TopLevelSymbol = TopLevelSymbol;
module.exports.topLevelSymbolTag = topLevelSymbolTag;
