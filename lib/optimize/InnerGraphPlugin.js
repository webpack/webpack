/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const PureExpressionDependency = require("../dependencies/PureExpressionDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../JavascriptParser")} JavascriptParser */
/** @typedef {import("../dependencies/HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */

const topLevelSymbolTag = Symbol("top level symbol");

/** @typedef {Map<TopLevelSymbol | HarmonyImportSpecifierDependency, Set<string | TopLevelSymbol> | true>} InnerGraph */

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

					parser.hooks.finish.tap("HarmonyImportDependencyParserPlugin", () => {
						const innerGraph =
							/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
						if (!innerGraph) return;
						// flatten graph
						const unexpanded = new Set(innerGraph.keys());
						const expand = key => {
							if (!unexpanded.has(key)) return;
							unexpanded.delete(key);
							const value = innerGraph.get(key);
							if (value !== true && value !== undefined) {
								const newSet = new Set();
								for (const item of value) {
									if (typeof item === "string") {
										newSet.add(item);
									} else {
										expand(item);
										const itemValue = innerGraph.get(item);
										if (itemValue === true) {
											innerGraph.set(key, true);
											return;
										}
										if (itemValue !== undefined) {
											for (const i of itemValue) {
												if (typeof i === "string") newSet.add(i);
											}
										}
									}
								}
								if (newSet.size === 0) {
									innerGraph.set(key, undefined);
								} else {
									innerGraph.set(key, newSet);
								}
							}
						};
						for (const item of unexpanded) {
							expand(item);
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
									parser.defineVariable("*default*");
									const fn = new TopLevelSymbol("*default*", innerGraph);
									parser.tagVariable("*default*", topLevelSymbolTag, fn);
									statementWithTopLevelSymbol.set(statement, fn);
								}
							}
						}
					});
					const declWithTopLevelSymbol = new WeakMap();
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
									const innerGraph =
										/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
									parser.defineVariable(decl.id.name);
									const fn = new TopLevelSymbol(decl.id.name, innerGraph);
									parser.tagVariable(decl.id.name, topLevelSymbolTag, fn);
									declWithTopLevelSymbol.set(decl, fn);
									return true;
								}
								if (
									decl.init.range[0] - decl.id.range[1] > 9 &&
									parser
										.getComments([decl.id.range[1], decl.init.range[0]])
										.some(
											comment =>
												comment.type === "Block" &&
												/^\s*(#|@)__PURE__\s*$/.test(comment.value)
										)
								) {
									const innerGraph =
										/** @type {InnerGraph} */ (parser.state.harmonyInnerGraph);
									const name = decl.id.name;
									parser.defineVariable(name);
									const fn = new TopLevelSymbol(name, innerGraph);
									parser.tagVariable(name, topLevelSymbolTag, fn);
									declWithTopLevelSymbol.set(decl, fn);
									const dep = new PureExpressionDependency(decl.init.range);
									dep.loc = decl.loc;
									parser.state.module.addDependency(dep);
									parser.state.harmonyAllExportDependentDependencies.add(dep);
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
					.tap("HarmonyModulesPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("HarmonyModulesPlugin", handler);
			}
		);
	}
}

module.exports = InnerGraphPlugin;
module.exports.TopLevelSymbol = TopLevelSymbol;
module.exports.topLevelSymbolTag = topLevelSymbolTag;
