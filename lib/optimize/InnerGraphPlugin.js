/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	harmonySpecifierTag
} = require("../dependencies/esm/ESMImportDependencyParserPlugin");
const isDependencyKind = require("../graph/isDependencyKind");
const { Field, Flag, NodeType, Part } = require("../javascript/syntax").parser;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const { getInnerGraphUtils, topLevelSymbolTag } = require("./InnerGraph");
const PureExpressionDependency = require("./PureExpressionDependency");

/**
 * @import {
 * 	ClassDeclaration,
 * 	ClassExpression,
 * 	Expression,
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
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "../javascript/JavascriptParser" */
/** @import { TopLevelSymbol } from "./InnerGraph" */

const PLUGIN_NAME = "InnerGraphPlugin";

/**
 * The static name of a member expression's property, as
 * `extractMemberExpressionChain` reads it, by id.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} member the member expression
 * @returns {string | undefined} the name, `undefined` for a dynamic property
 */
const memberNameNode = (path, member) => {
	const property = path.field(0, Field.property, member);
	const type = path.type(property);
	if (!path.flag(Flag.computed, member)) {
		return type === NodeType.Identifier ? path.name(property) : undefined;
	}
	if (type === NodeType.Literal) return `${path.value(property)}`;
	if (
		type !== NodeType.TemplateLiteral ||
		path.fieldCount(Field.expressions, property) !== 0
	) {
		return;
	}
	// an untagged template's quasi always has a cooked value
	return /** @type {{ cooked: string }} */ (
		path.value(path.field(0, Field.quasis, property))
	).cooked;
};
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
					 * Whether an expression can be dropped from code that still runs:
					 * the parser's purity rules, plus for a bare name that it will
					 * resolve, as a name nothing defines throws a ReferenceError.
					 * @param {JavascriptNodeReader} path the path the tap got
					 * @param {number} node the node
					 * @param {number} commentsStartPos source position from which annotation comments are checked
					 * @returns {boolean} true, when the expression is pure
					 */
					const isPureNode = (path, node, commentsStartPos) => {
						if (
							!parser.isPure(parser.nodeOfPath(path, node), commentsStartPos)
						) {
							return false;
						}
						if (path.type(node) !== NodeType.Identifier) return true;
						const name = path.name(node);
						return name === "undefined" || parser.isVariableDefined(name);
					};

					/**
					 * Registers a pure superclass or static value, whose range is taken now as the
					 * tree is gone when the callback fires.
					 * @param {Expression} node the node, as `parser.nodeOfPath` gives it
					 * @param {Range} range its range
					 */
					const onUsagePure = (node, range) => {
						// the callback fires after parsing, when the parser can no
						// longer map offsets — take the location now
						const loc = parser.getLocation(node);
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

					parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
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
					// variable declarator. Each is keyed by `parser.nodeOfPath`: its id in the
					// tree walk, so a statement no symbol is kept for makes no object.

					/** @type {Map<Node, TopLevelSymbol>} */
					let statementWithTopLevelSymbol = new Map();
					/** @type {Map<Node, Range>} */
					let statementPurePart = new Map();
					/** @type {Map<Node, TopLevelSymbol>} */
					let classWithTopLevelSymbol = new Map();
					/** @type {Map<Node, TopLevelSymbol>} */
					let declWithTopLevelSymbol = new Map();
					/** @type {Set<Node>} */
					let pureDeclarators = new Set();
					/** @type {Map<Node, (compilation: Compilation, module: Module) => boolean>} */
					let pureConditionByCallExpr = new Map();

					parser.hooks.isPure.for("CallExpression").tap(
						{
							name: PLUGIN_NAME,
							stage: -10,
							path: true
						},
						(path, node) => {
							const callee = path.field(0, Field.callee, node);
							/** @type {string[]} */
							const chainMembers = [];
							// the member chain `extractMemberExpressionChain` reads, by id
							let root = callee;
							while (path.type(root) === NodeType.MemberExpression) {
								// optional chaining short-circuits and breaks straight purity
								if (path.flag(Flag.optional, root)) return;
								const member = memberNameNode(path, root);
								if (member === undefined) break;
								chainMembers.unshift(member);
								root = path.field(0, Field.object, root);
							}
							if (path.type(root) !== NodeType.Identifier) return;
							const harmonySettings =
								/** @type {{ source: string, ids: string[] } | undefined} */ (
									parser.getTagData(path.name(root), harmonySpecifierTag)
								);
							if (!harmonySettings) return;
							const ids = [...harmonySettings.ids, ...chainMembers];
							if (ids.length === 0) return;
							let pos = path.end(callee);
							const count = path.fieldCount(Field.arguments, node);
							for (let i = 0; i < count; i++) {
								const arg = path.field(i, Field.arguments, node);
								if (path.type(arg) === NodeType.SpreadElement) return;
								if (!isPureNode(path, arg, pos)) return;
								pos = path.end(arg);
							}
							const source = harmonySettings.source;
							pureConditionByCallExpr.set(
								parser.nodeOfPath(path, node),
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

							if (
								parser.scope.topLevelScope === true &&
								path.type(statement) === NodeType.FunctionDeclaration
							) {
								const id = path.field(0, Field.id, statement);
								const name = id !== 0 ? path.name(id) : "*default*";
								const symbol = /** @type {TopLevelSymbol} */ (
									innerGraph.tagTopLevelSymbol(
										parser,
										name,
										isPureNode(path, statement, path.start(statement))
									)
								);
								statementWithTopLevelSymbol.set(
									parser.nodeOfPath(path, statement),
									symbol
								);
								return true;
							}
						});

					/**
					 * @param {JavascriptNodeReader} path the path the tap got
					 * @param {number} statement statement
					 * @returns {boolean | void} true when handled
					 */
					const blockPreStatementHandler = (path, statement) => {
						if (!innerGraph.isEnabled(parser.state)) return;

						if (parser.scope.topLevelScope === true) {
							const type = path.type(statement);
							if (type === NodeType.ClassDeclaration) {
								const id = path.field(0, Field.id, statement);
								const name = id !== 0 ? path.name(id) : "*default*";
								const pure = isPureNode(path, statement, path.start(statement));
								const symbol = /** @type {TopLevelSymbol} */ (
									innerGraph.tagTopLevelSymbol(parser, name, pure)
								);
								classWithTopLevelSymbol.set(
									parser.nodeOfPath(path, statement),
									symbol
								);
								return true;
							}
							if (type === NodeType.ExportDefaultDeclaration) {
								const name = "*default*";
								const decl = path.field(0, Field.declaration, statement);
								const declType = path.type(decl);
								/** @type {boolean | ((compilation: Compilation, module: Module) => boolean)} */
								let pure = isPureNode(path, decl, path.start(statement));
								if (!pure && declType === NodeType.CallExpression) {
									const deferred = pureConditionByCallExpr.get(
										parser.nodeOfPath(path, decl)
									);
									if (deferred) pure = deferred;
								}
								const symbol =
									/** @type {TopLevelSymbol} */
									(innerGraph.tagTopLevelSymbol(parser, name, pure));
								if (
									declType === NodeType.ClassExpression ||
									declType === NodeType.ClassDeclaration
								) {
									classWithTopLevelSymbol.set(
										parser.nodeOfPath(path, decl),
										symbol
									);
								} else {
									statementWithTopLevelSymbol.set(
										parser.nodeOfPath(path, statement),
										symbol
									);
									if (
										pure &&
										// body deferred to call-time, no eager read
										declType !== NodeType.FunctionExpression &&
										declType !== NodeType.ArrowFunctionExpression &&
										// only FunctionDeclaration here (classes routed above), body deferred
										declType !== NodeType.FunctionDeclaration &&
										// literal references nothing
										declType !== NodeType.Literal
									) {
										statementPurePart.set(
											parser.nodeOfPath(path, statement),
											path.range(decl)
										);
									}
								}
							}
						}
					};
					parser.hooks.blockPreStatementByType
						.for("ClassDeclaration")
						.tap({ name: PLUGIN_NAME, path: true }, blockPreStatementHandler);
					parser.hooks.blockPreStatementByType
						.for("ExportDefaultDeclaration")
						.tap({ name: PLUGIN_NAME, path: true }, blockPreStatementHandler);

					// every declarator reaches this tap, so it reads ids
					parser.hooks.preDeclarator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, decl, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							const kind = /** @type {string} */ (
								path.textOf(Part.kind, statement)
							);
							if (impureVariableDeclarationKinds.has(kind)) return;
							if (parser.scope.topLevelScope !== true) return;
							const init = path.field(0, Field.init, decl);
							const id = path.field(0, Field.id, decl);
							if (init === 0 || path.type(id) !== NodeType.Identifier) return;
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
							let pure = isPureNode(path, init, path.end(id));
							if (!pure && initType === NodeType.CallExpression) {
								const deferred = pureConditionByCallExpr.get(
									parser.nodeOfPath(path, init)
								);
								if (deferred) pure = deferred;
							}

							const symbol =
								/** @type {TopLevelSymbol} */
								(innerGraph.tagTopLevelSymbol(parser, name, pure));
							if (initType === NodeType.ClassExpression) {
								classWithTopLevelSymbol.set(
									parser.nodeOfPath(path, init),
									symbol
								);
							} else {
								const key = parser.nodeOfPath(path, decl);
								declWithTopLevelSymbol.set(key, symbol);
								if (
									pure &&
									initType !== NodeType.FunctionExpression &&
									initType !== NodeType.ArrowFunctionExpression &&
									initType !== NodeType.Literal
								) {
									pureDeclarators.add(key);
								}
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

					// every statement reaches this tap, so it reads ids
					parser.hooks.statement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								innerGraph.setTopLevelSymbol(parser.state, undefined);

								const key = parser.nodeOfPath(path, statement);
								const symbol = statementWithTopLevelSymbol.get(key);
								if (symbol) {
									innerGraph.setTopLevelSymbol(parser.state, symbol);
									const purePart = statementPurePart.get(key);
									if (purePart) onUsagePure(key, purePart);
								}
							}
						}
					);

					parser.hooks.classExtendsExpression.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expr, statement) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(
									parser.nodeOfPath(path, statement)
								);
								const id = path.field(0, Field.id, statement);
								if (
									symbol &&
									isPureNode(
										path,
										expr,
										id !== 0 ? path.end(id) : path.start(statement)
									)
								) {
									innerGraph.setTopLevelSymbol(parser.state, symbol);
									onUsagePure(parser.nodeOfPath(path, expr), path.range(expr));
								}
							}
						}
					);

					parser.hooks.classBodyElement.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(
									parser.nodeOfPath(path, classDefinition)
								);
								if (symbol) {
									innerGraph.setTopLevelSymbol(parser.state, undefined);
								}
							}
						}
					);

					parser.hooks.classBodyValue.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, expression, element, classDefinition) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (parser.scope.topLevelScope === true) {
								const symbol = classWithTopLevelSymbol.get(
									parser.nodeOfPath(path, classDefinition)
								);
								if (symbol) {
									const isStatic = path.flag(Flag.static, element);
									const key = path.field(0, Field.key, element);
									if (
										!isStatic ||
										isPureNode(
											path,
											expression,
											key !== 0 ? path.end(key) : path.start(element)
										)
									) {
										innerGraph.setTopLevelSymbol(parser.state, symbol);
										if (
											path.type(element) !== NodeType.MethodDefinition &&
											isStatic
										) {
											onUsagePure(
												parser.nodeOfPath(path, expression),
												path.range(expression)
											);
										}
									} else {
										innerGraph.setTopLevelSymbol(parser.state, undefined);
									}
								}
							}
						}
					);

					// every declarator reaches this tap, so it reads ids
					parser.hooks.declarator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, decl) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							const key = parser.nodeOfPath(path, decl);
							const symbol = declWithTopLevelSymbol.get(key);
							const init = path.field(0, Field.init, decl);

							if (symbol) {
								innerGraph.setTopLevelSymbol(parser.state, symbol);
								if (pureDeclarators.has(key)) {
									if (path.type(init) === NodeType.ClassExpression) {
										const superClass = path.field(0, Field.superClass, init);
										if (superClass !== 0) {
											onUsagePure(
												parser.nodeOfPath(path, superClass),
												path.range(superClass)
											);
										}
									} else {
										onUsagePure(key, path.range(init));
									}
								}
								parser.walkExpression(parser.nodeOfPath(path, init));
								innerGraph.setTopLevelSymbol(parser.state, undefined);
								return true;
							} else if (
								init !== 0 &&
								path.type(path.field(0, Field.id, decl)) ===
									NodeType.Identifier &&
								path.type(init) === NodeType.ClassExpression &&
								classWithTopLevelSymbol.has(parser.nodeOfPath(path, init))
							) {
								parser.walkExpression(parser.nodeOfPath(path, init));
								innerGraph.setTopLevelSymbol(parser.state, undefined);
								return true;
							}
						}
					);

					parser.hooks.expression
						.for(topLevelSymbolTag)
						.tap({ name: PLUGIN_NAME, path: true }, () => {
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
						.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
							if (!innerGraph.isEnabled(parser.state)) return;
							if (path.textOf(Part.operator, expr) === "=") return true;
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
