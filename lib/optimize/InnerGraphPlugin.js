/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InnerGraph = require("./InnerGraph");

const {
	harmonySpecifierTag
} = require("../dependencies/HarmonyImportDependencyParserPlugin");
const PureExpressionDependency = require("../dependencies/PureExpressionDependency");

/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./InnerGraph").InnerGraph} InnerGraph */
/** @typedef {import("./InnerGraph").GraphNode} GraphNode */

const graphNodeSymbol = Symbol("inner graph node symbol");

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

function isTopLevel(parser) {
	return parser.scope.topLevelScope === true;
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
						InnerGraph.enable(parser.state);
					});

					parser.hooks.finish.tap("InnerGraphPlugin", () => {
						const graphState = InnerGraph.getState(parser.state);

						if (!graphState) {
							return;
						}

						for (const graphNode of graphState.graph.keys()) {
							let links = graphNode.graph.get(graphNode);

							if (links instanceof Set) {
								links = graphNode.usedByExports;
							}

							InnerGraph.hooks.usedByExports.for(graphNode).call(links);

							if (
								pureDeclarators.has(graphNode.astNode) &&
								graphNode.usedByExports.size
							) {
								const dep = new PureExpressionDependency(
									// @ts-ignore
									graphNode.astNode.init.range
								);
								dep.loc = graphNode.astNode.loc;
								dep.usedByExports = graphNode.usedByExports;
								parser.state.module.addDependency(dep);
							}
						}
					});
					parser.hooks.preStatement.tap("InnerGraphPlugin", statement => {
						if (isTopLevel(parser)) {
							if (statement.type === "FunctionDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								parser.defineVariable(name);
								const graphNode = InnerGraph.getNode(
									parser.state,
									statement,
									name
								);
								if (graphNode) {
									parser.tagVariable(name, graphNodeSymbol, graphNode);
								}
								return true;
							}
						}
					});
					parser.hooks.blockPreStatement.tap("InnerGraphPlugin", statement => {
						if (isTopLevel(parser)) {
							if (statement.type === "ClassDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								parser.defineVariable(name);
								const graphNode = InnerGraph.getNode(
									parser.state,
									statement,
									name
								);
								if (graphNode) {
									parser.tagVariable(name, graphNodeSymbol, graphNode);
								}
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
									const name = "*default*";
									parser.defineVariable(name);
									const graphNode = InnerGraph.getNode(
										parser.state,
										statement,
										name,
										true
									);

									if (graphNode) {
										parser.tagVariable(name, graphNodeSymbol, graphNode);
									}
								}
							}
						}
					});
					const tagVar = (decl, name) => {
						parser.defineVariable(name);
						const existingTag = parser.getTagData(name, graphNodeSymbol);
						const graphNode =
							existingTag || InnerGraph.getNode(parser.state, decl, name, true);
						if (!existingTag) {
							parser.tagVariable(name, graphNodeSymbol, graphNode);
						}
						return graphNode;
					};
					const pureDeclarators = new WeakSet();
					parser.hooks.preDeclarator.tap(
						"InnerGraphPlugin",
						(decl, statement) => {
							if (
								isTopLevel(parser) &&
								decl.init &&
								decl.id.type === "Identifier"
							) {
								if (
									decl.init.type === "FunctionExpression" ||
									decl.init.type === "ArrowFunctionExpression" ||
									decl.init.type === "ClassExpression"
								) {
									const name = decl.id.name;
									tagVar(decl, name);
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
									tagVar(decl, name);
									pureDeclarators.add(decl);
									return true;
								}
							}
						}
					);
					parser.hooks.statement.tap("InnerGraphPlugin", statement => {
						if (isTopLevel(parser)) {
							InnerGraph.setTopLevelNode(parser.state, undefined);
							const graphNode = InnerGraph.getNodeForExpr(
								parser.state,
								statement
							);
							if (graphNode) {
								InnerGraph.setTopLevelNode(parser.state, graphNode);
							}
						}
					});
					parser.hooks.declarator.tap("InnerGraphPlugin", (decl, statement) => {
						const graphNode = InnerGraph.getNodeForExpr(parser.state, decl);
						if (graphNode) {
							InnerGraph.setTopLevelNode(parser.state, graphNode);
							parser.walkExpression(decl.init);
							InnerGraph.setTopLevelNode(parser.state, undefined);
							return true;
						}
					});
					parser.hooks.expression
						.for(graphNodeSymbol)
						.tap("InnerGraphPlugin", expr => {
							const topLevelSymbol =
								/** @type {GraphNode} */ (parser.currentTagData);
							const currentTopLevelSymbol = InnerGraph.getTopLevelNode(
								parser.state
							);
							topLevelSymbol.addLink(currentTopLevelSymbol || true);
						});
					parser.hooks.assign
						.for(graphNodeSymbol)
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
module.exports.graphNodeSymbol = graphNodeSymbol;
