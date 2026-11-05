/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	harmonySpecifierTag
} = require("../dependencies/esm/ESMImportDependencyParserPlugin");
const isDependencyKind = require("../graph/isDependencyKind");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const memoize = require("../util/memoize");
const { getInnerGraphUtils, topLevelSymbolTag } = require("./InnerGraph");
const PureExpressionDependency = require("./PureExpressionDependency");

const getSyntaxParser = memoize(() => require("../javascript/syntax").parser);

/**
 * @import {
 * 	CallExpression,
 * 	ClassDeclaration,
 * 	ClassExpression,
 * 	MaybeNamedClassDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	Node
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */
/** @import { TopLevelSymbol } from "./InnerGraph" */

const PLUGIN_NAME = "InnerGraphPlugin";
const impureVariableDeclarationKinds = new Set(["using", "await using"]);

class InnerGraphPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const logger = compilation.getLogger("webpack.InnerGraphPlugin");
				const innerGraph = getInnerGraphUtils(compilation);

				compilation.dependencyTemplates.set(
					PureExpressionDependency,
					new PureExpressionDependency.Template()
				);

				/**
				 * Adds pure dependency added after parsing, with parents set so it survives persistent caching.
				 * @param {Module} module module
				 * @param {Dependency} dep pure dependency
				 * @returns {void}
				 */
				const addPureDependency = (module, dep) => {
					compilation.moduleGraph.setParents(dep, module, module, -1);
					module.addDependency(dep);
				};

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					/**
					 * Keeps a pure expression of a top-level class, when its class is used.
					 * @param {Range} range where the expression is
					 */
					const onUsagePure = (range) => {
						// the callback fires after parsing, when the parser can no
						// longer map offsets — take the location now
						const loc = parser.getLocation({ start: range[0], end: range[1] });
						innerGraph.onUsage(parser.state, (usedByExports, module) => {
							switch (usedByExports) {
								case undefined:
								case true:
									return;
								default: {
									const dep = new PureExpressionDependency(range);
									dep.loc = loc;
									dep.usedByExports = usedByExports;
									addPureDependency(module, dep);
									break;
								}
							}
						});
					};

					parser.hooks.program.tap(PLUGIN_NAME, () => {
						innerGraph.enable(parser.state);

						statementWithTopLevelSymbol = new Map();
						statementPurePart = new Map();
						classWithTopLevelSymbol = new Map();
						declWithTopLevelSymbol = new Map();
						pureDeclarators = new Set();
						pureConditionByCallExpr = new Map();
					});

					// During prewalking the following datastructures are filled with
					// nodes that have a TopLevelSymbol assigned and
					// variables are tagged with the assigned TopLevelSymbol

					// Three kinds of node carry a symbol: a full statement, a class, and a
					// variable declarator.

					// a top-level statement is known by where it starts, which the
					// walk reads through the path
					/** @type {Map<number, TopLevelSymbol>} */
					let statementWithTopLevelSymbol = new Map();
					/** @type {Map<number, Range>} */
					let statementPurePart = new Map();

					// a class and a declarator by where they start, a call by where it
					// ends: no two of one kind share that offset
					/** @type {Map<number, TopLevelSymbol>} */
					let classWithTopLevelSymbol = new Map();

					/** @type {Map<number, TopLevelSymbol>} */
					let declWithTopLevelSymbol = new Map();
					/** @type {Set<number>} */
					let pureDeclarators = new Set();

					/** @type {Map<number, (compilation: Compilation, module: Module) => boolean>} */
					let pureConditionByCallExpr = new Map();

					parser.hooks.isPure.for("CallExpression").tap(
						{
							name: PLUGIN_NAME,
							stage: -10
						},
						(expression) => {
							const expr = /** @type {CallExpression} */ (expression);
							const callee = expr.callee;
							/** @type {Node} */
							let root;
							/** @type {string[]} */
							let chainMembers;
							if (callee.type === "Identifier") {
								root = callee;
								chainMembers = [];
							} else if (callee.type === "MemberExpression") {
								const chain = parser.extractMemberExpressionChain(callee);
								// optional chaining short-circuits and breaks straight purity
								if (chain.membersOptionals.some(Boolean)) return;
								root = /** @type {Node} */ (chain.object);
								// extractMemberExpressionChain returns members in reverse
								chainMembers = [...chain.members].reverse();
							} else {
								return;
							}
							if (root.type !== "Identifier") return;
							const harmonySettings =
								/** @type {{ source: string, ids: string[] } | undefined} */ (
									parser.getTagData(root.name, harmonySpecifierTag)
								);
							if (!harmonySettings) return;
							const ids = [...harmonySettings.ids, ...chainMembers];
							if (ids.length === 0) return;
							let pos = /** @type {Range} */ (callee.range)[1];
							for (const arg of expr.arguments) {
								if (arg.type === "SpreadElement") return;
								if (!parser.isPure(arg, pos)) return;
								pos = /** @type {Range} */ (arg.range)[1];
							}
							const source = harmonySettings.source;
							pureConditionByCallExpr.set(
								/** @type {Range} */ (expr.range)[1],
								(compilation, module) => {
									const moduleGraph = compilation.moduleGraph;
									for (const dep of module.dependencies) {
										if (
											isDependencyKind(dep, "esm-side-effect-import") &&
											dep.request === source
										) {
											const m = moduleGraph.getModule(dep);
											if (!m) return false;
											const exportInfo = moduleGraph
												.getExportsInfo(m)
												.getReadOnlyExportInfoRecursive(ids);
											if (!exportInfo) return false;
											const target = exportInfo.getTarget(moduleGraph);
											const final =
												target && target.export
													? moduleGraph
															.getExportsInfo(target.module)
															.getReadOnlyExportInfoRecursive(target.export)
													: exportInfo;
											return final !== undefined && final.pureProvide === true;
										}
									}
									return false;
								}
							);
						}
					);

					// The following hooks are used during prewalking:

					parser.hooks.preStatementByType
						.for("FunctionDeclaration")
						.tap({ name: PLUGIN_NAME, path: true }, (path, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope !== true) return;
							const id = path.field(0, getSyntaxParser().Field.id, statement);
							const start = path.start(statement);
							const symbol = /** @type {TopLevelSymbol} */ (
								innerGraph.tagTopLevelSymbol(
									parser,
									id !== 0 ? path.name(id) : "*default*",
									parser.isPure(statement, start)
								)
							);
							statementWithTopLevelSymbol.set(start, symbol);
							return true;
						});

					/**
					 * @param {import("estree").Statement | import("estree").ModuleDeclaration | import("estree").MaybeNamedFunctionDeclaration | import("estree").MaybeNamedClassDeclaration} statement statement
					 * @returns {boolean | void} true when handled
					 */
					const blockPreStatementHandler = (statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;

						if (parser.scope.topLevelScope === true) {
							if (statement.type === "ClassDeclaration") {
								const name = statement.id ? statement.id.name : "*default*";
								const pure = parser.isPure(
									statement,
									/** @type {Range} */ (statement.range)[0]
								);
								const symbol = /** @type {TopLevelSymbol} */ (
									innerGraph.tagTopLevelSymbol(parser, name, pure)
								);
								classWithTopLevelSymbol.set(
									/** @type {Range} */ (statement.range)[0],
									symbol
								);
								return true;
							}
							if (statement.type === "ExportDefaultDeclaration") {
								const name = "*default*";
								const decl = statement.declaration;
								/** @type {boolean | ((compilation: Compilation, module: Module) => boolean)} */
								let pure = parser.isPure(
									decl,
									/** @type {Range} */ (statement.range)[0]
								);
								if (!pure && decl.type === "CallExpression") {
									const deferred = pureConditionByCallExpr.get(
										/** @type {Range} */ (decl.range)[1]
									);
									if (deferred) pure = deferred;
								}
								const symbol =
									/** @type {TopLevelSymbol} */
									(innerGraph.tagTopLevelSymbol(parser, name, pure));
								if (
									decl.type === "ClassExpression" ||
									decl.type === "ClassDeclaration"
								) {
									classWithTopLevelSymbol.set(
										/** @type {Range} */ (decl.range)[0],
										symbol
									);
								} else {
									statementWithTopLevelSymbol.set(
										/** @type {Range} */ (statement.range)[0],
										symbol
									);
									if (
										pure &&
										// body deferred to call-time, no eager read
										!decl.type.endsWith("FunctionExpression") &&
										// only FunctionDeclaration here (classes routed above), body deferred
										!decl.type.endsWith("Declaration") &&
										// literal references nothing
										decl.type !== "Literal"
									) {
										statementPurePart.set(
											/** @type {Range} */ (statement.range)[0],
											/** @type {Range} */ (decl.range)
										);
									}
								}
							}
						}
					};
					parser.hooks.blockPreStatementByType
						.for("ClassDeclaration")
						.tap(PLUGIN_NAME, blockPreStatementHandler);
					parser.hooks.blockPreStatementByType
						.for("ExportDefaultDeclaration")
						.tap(PLUGIN_NAME, blockPreStatementHandler);

					parser.hooks.preDeclarator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, declarator, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope !== true) return;
							const { Field, NodeType, Part } = getSyntaxParser();
							const kind = path.textOf(Part.kind, statement);
							if (kind === null || impureVariableDeclarationKinds.has(kind)) {
								return;
							}
							const init = path.field(0, Field.init, declarator);
							if (init === 0) return;
							const id = path.field(0, Field.id, declarator);
							if (path.type(id) !== NodeType.Identifier) return;
							const name = path.name(id);
							// Skip webpack runtime variables handled by CompatibilityPlugin
							if (
								name === RuntimeGlobals.require ||
								name === RuntimeGlobals.exports
							) {
								return;
							}
							const initType = path.type(init);
							/** @type {boolean | ((compilation: Compilation, module: Module) => boolean)} */
							let pure = parser.isPure(init, path.end(id));
							if (!pure && initType === NodeType.CallExpression) {
								const deferred = pureConditionByCallExpr.get(path.end(init));
								if (deferred) pure = deferred;
							}
							const symbol =
								/** @type {TopLevelSymbol} */
								(innerGraph.tagTopLevelSymbol(parser, name, pure));
							if (initType === NodeType.ClassExpression) {
								classWithTopLevelSymbol.set(path.start(init), symbol);
								return;
							}
							const start = path.start(declarator);
							declWithTopLevelSymbol.set(start, symbol);
							if (
								pure &&
								initType !== NodeType.FunctionExpression &&
								initType !== NodeType.ArrowFunctionExpression &&
								initType !== NodeType.Literal
							) {
								pureDeclarators.add(start);
							}
						}
					);

					// During real walking we set the TopLevelSymbol state to the assigned
					// TopLevelSymbol by using the fill datastructures.

					// A `PureExpressionDependency` is sometimes added too, so a pure
					// expression is skipped even where minimizing leaves it: the symbols it
					// uses may have been removed as unused by this optimization.

					// A reference registers a dependency from the symbol in state to the one
					// referenced, which is how the graph of all of them is built.

					// The following hooks are called during walking:

					parser.hooks.statement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								innerGraph.setTopLevelSymbol(parser.state, undefined);

								const start = path.start(statement);
								const symbol = statementWithTopLevelSymbol.get(start);
								if (symbol) {
									innerGraph.setTopLevelSymbol(parser.state, symbol);
									const purePart = statementPurePart.get(start);
									if (purePart) {
										// the callback fires after parsing, when the parser can no
										// longer map offsets — take the location now
										const loc = parser.getLocation({
											start,
											end: path.end(statement)
										});
										innerGraph.onUsage(
											parser.state,
											(usedByExports, module) => {
												switch (usedByExports) {
													case undefined:
													case true:
														return;
													default: {
														const dep = new PureExpressionDependency(purePart);
														dep.loc = loc;
														dep.usedByExports = usedByExports;
														addPureDependency(module, dep);
														break;
													}
												}
											}
										);
									}
								}
							}
						}
					);

					parser.hooks.classExtendsExpression.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope !== true) return;
							const start = path.start(classDefinition);
							const symbol = classWithTopLevelSymbol.get(start);
							if (symbol === undefined) return;
							const id = path.field(
								0,
								getSyntaxParser().Field.id,
								classDefinition
							);
							if (parser.isPure(expression, id !== 0 ? path.end(id) : start)) {
								innerGraph.setTopLevelSymbol(parser.state, symbol);
								onUsagePure([path.start(expression), path.end(expression)]);
							}
						}
					);

					parser.hooks.classBodyElement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (
								parser.scope.topLevelScope === true &&
								classWithTopLevelSymbol.has(path.start(classDefinition))
							) {
								innerGraph.setTopLevelSymbol(parser.state, undefined);
							}
						}
					);

					parser.hooks.classBodyValue.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression, element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope !== true) return;
							const symbol = classWithTopLevelSymbol.get(
								path.start(classDefinition)
							);
							if (symbol === undefined) return;
							const { Field, Flag, NodeType } = getSyntaxParser();
							const isStatic = path.flag(Flag.static, element);
							const key = path.field(0, Field.key, element);
							if (
								isStatic &&
								!parser.isPure(
									expression,
									key !== 0 ? path.end(key) : path.start(element)
								)
							) {
								innerGraph.setTopLevelSymbol(parser.state, undefined);
								return;
							}
							innerGraph.setTopLevelSymbol(parser.state, symbol);
							if (
								isStatic &&
								path.type(element) !== NodeType.MethodDefinition
							) {
								onUsagePure([path.start(expression), path.end(expression)]);
							}
						}
					);

					parser.hooks.declarator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, declarator) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							const { Field, NodeType } = getSyntaxParser();
							const init = path.field(0, Field.init, declarator);
							if (init === 0) return;
							const start = path.start(declarator);
							const symbol = declWithTopLevelSymbol.get(start);
							if (symbol) {
								innerGraph.setTopLevelSymbol(parser.state, symbol);
								if (pureDeclarators.has(start)) {
									// the callback fires after parsing, when the parser can no
									// longer map offsets — take the location now
									const loc = parser.getLocation({
										start,
										end: path.end(declarator)
									});
									/** @type {Range} */
									const range = [path.start(init), path.end(init)];
									innerGraph.onUsage(parser.state, (usedByExports, module) => {
										switch (usedByExports) {
											case undefined:
											case true:
												return;
											default: {
												const dep = new PureExpressionDependency(range);
												dep.loc = loc;
												dep.usedByExports = usedByExports;
												addPureDependency(module, dep);
												break;
											}
										}
									});
								}
							} else if (
								path.type(init) !== NodeType.ClassExpression ||
								path.type(path.field(0, Field.id, declarator)) !==
									NodeType.Identifier ||
								!classWithTopLevelSymbol.has(path.start(init))
							) {
								return;
							}
							parser.walkExpression(init);
							innerGraph.setTopLevelSymbol(parser.state, undefined);
							return true;
						}
					);

					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap(PLUGIN_NAME, () => {
							const topLevelSymbol = /** @type {TopLevelSymbol} */ (
								parser.currentTagData
							);
							const currentTopLevelSymbol = innerGraph.getTopLevelSymbol(
								parser.state
							);
							innerGraph.addUsage(
								parser.state,
								topLevelSymbol,
								currentTopLevelSymbol || true
							);
						});
					parser.hooks.assign
						.for(topLevelSymbolTag)
						.tap(PLUGIN_NAME, (expr) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (expr.operator === "=") return true;
						});
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);

				compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
					logger.time("infer dependency usage");
					for (const module of modules) {
						innerGraph.inferDependencyUsage(module);
						// state is dead after inference; release it to not retain ASTs via callbacks
						innerGraph.release(module);
					}
					logger.timeEnd("infer dependency usage");
				});
			}
		);
	}
}

module.exports = InnerGraphPlugin;
