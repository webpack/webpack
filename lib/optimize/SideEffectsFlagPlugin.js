/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const glob2regexp = require("watchpack").util.globToRegExp;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const { STAGE_DEFAULT } = require("../OptimizationStages");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const { ImportPhaseUtils } = require("../dependencies/ImportPhase");
const formatLocation = require("../util/formatLocation");
const { CompilerHintNotationRegExp } = require("../util/magicComment");

/** @typedef {import("estree").MaybeNamedClassDeclaration} MaybeNamedClassDeclaration */
/** @typedef {import("estree").MaybeNamedFunctionDeclaration} MaybeNamedFunctionDeclaration */
/** @typedef {import("estree").ModuleDeclaration} ModuleDeclaration */
/** @typedef {import("estree").Statement} Statement */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../javascript/JavascriptModule").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../ExportsInfo").TargetItemWithConnection} TargetItemWithConnection */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */

/**
 * Defines the export in module type used by this module.
 * @typedef {object} ExportInModule
 * @property {Module} module the module
 * @property {string} exportName the name of the export
 * @property {boolean} checked if the export is conditional
 */

/** @typedef {string | boolean | string[] | undefined} SideEffectsFlagValue */

/** @typedef {Map<string, RegExp>} CacheItem */

/**
 * Whether a resolved re-export target is reached through an `import defer` edge.
 * Such edges must not be collapsed by the side-effect-free barrel optimization:
 * the source module has to keep being reached through the barrel's cached
 * deferred namespace so deferred-namespace identity and evaluation semantics are
 * preserved.
 * @param {ModuleGraphConnection | undefined} connection the target connection
 * @returns {boolean} true when the target connection is a deferred import
 */
const isDeferredTargetConnection = (connection) =>
	connection !== undefined &&
	connection.dependency instanceof HarmonyImportDependency &&
	ImportPhaseUtils.isDefer(connection.dependency.phase);

/** @type {WeakMap<Compiler, CacheItem>} */
const globToRegexpCache = new WeakMap();

/**
 * Returns a regular expression.
 * @param {string} glob the pattern
 * @param {CacheItem} cache the glob to RegExp cache
 * @returns {RegExp} a regular expression
 */
const globToRegexp = (glob, cache) => {
	const cacheEntry = cache.get(glob);
	if (cacheEntry !== undefined) return cacheEntry;
	if (!glob.includes("/")) {
		glob = `**/${glob}`;
	}
	const regexpSource = glob2regexp(glob);
	const regexp = new RegExp(`^(\\./)?${regexpSource}$`);
	cache.set(glob, regexp);
	return regexp;
};

/**
 * @param {JavascriptParser} parser parser
 * @param {number} start start position
 * @param {number} end end position
 * @returns {boolean} if annotation is found in the range
 */
const hasNoSideEffectsNotation = (parser, start, end) => {
	// Fast path
	if (end - start < 18) return false;

	const comments = parser.getComments([start, end]);
	return comments.some(
		(c) =>
			c.type === "Block" &&
			CompilerHintNotationRegExp.NoSideEffects.test(c.value)
	);
};

const PLUGIN_NAME = "SideEffectsFlagPlugin";

const notSideEffectsTag = Symbol("NoSideEffects");

/** @type {(target: { module: Module }) => boolean} */
const RETURNS_FALSE = () => false;

/**
 * Detects if the module is "pure single-star passthrough": one whose entire export
 * surface is exactly one `export * from "x"` (no named/local/default-bearing
 * exports, no second star). For such a module `export * from "passthrough"` is
 * equivalent to `export * from "x"`, so the passthrough can be skipped.
 * @param {Module} module the candidate passthrough module
 * @returns {boolean} true when the module is a pure single-star passthrough
 */
const moduleHasSingleStarReexport = (module) => {
	/** @type {HarmonyExportImportedSpecifierDependency | undefined} */
	let starReexportDep;
	for (const dep of module.dependencies) {
		if (!(dep instanceof HarmonyExportImportedSpecifierDependency)) continue;
		// a named re-export (`export { x } from` / `export * as ns from`) means
		// the module owns names a star into its source wouldn't reproduce
		if (dep.name !== null) return false;
		// any named/local export populates the shared activeExports set
		if (dep.activeExports.size !== 0) return false;
		// more than one `export *` can't be collapsed to a single source
		if (dep.allStarExports && dep.allStarExports.dependencies.length !== 1) {
			return false;
		}
		starReexportDep = dep;
	}
	if (starReexportDep === undefined) return false;
	return true;
};

class SideEffectsFlagPlugin {
	/**
	 * Creates an instance of SideEffectsFlagPlugin.
	 * @param {boolean} analyseSource analyse source code for side effects
	 */
	constructor(analyseSource = true) {
		/** @type {boolean} */
		this._analyseSource = analyseSource;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		let cache = globToRegexpCache.get(compiler.root);
		if (cache === undefined) {
			cache = new Map();
			globToRegexpCache.set(compiler.root, cache);
		}
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;
				normalModuleFactory.hooks.module.tap(PLUGIN_NAME, (module, data) => {
					const resolveData = data.resourceResolveData;
					if (
						resolveData &&
						resolveData.descriptionFileData &&
						resolveData.relativePath
					) {
						const sideEffects = resolveData.descriptionFileData.sideEffects;
						if (sideEffects !== undefined) {
							if (module.factoryMeta === undefined) {
								module.factoryMeta = {};
							}
							const hasSideEffects = SideEffectsFlagPlugin.moduleHasSideEffects(
								resolveData.relativePath,
								/** @type {SideEffectsFlagValue} */ (sideEffects),
								/** @type {CacheItem} */ (cache)
							);
							module.factoryMeta.sideEffectFree = !hasSideEffects;
						}
					}

					return module;
				});
				normalModuleFactory.hooks.module.tap(PLUGIN_NAME, (module, data) => {
					const settings = data.settings;
					if (typeof settings.sideEffects === "boolean") {
						if (module.factoryMeta === undefined) {
							module.factoryMeta = {};
						}
						module.factoryMeta.sideEffectFree = !settings.sideEffects;
					}
					return module;
				});
				if (this._analyseSource) {
					/**
					 * Processes the provided parser.
					 * @param {JavascriptParser} parser the parser
					 * @returns {void}
					 */
					const applySideEffectsStmtHandler = (parser) => {
						/** @type {undefined | Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} */
						let sideEffectsStatement;
						parser.hooks.program.tap(PLUGIN_NAME, () => {
							sideEffectsStatement = undefined;
						});
						parser.hooks.statement.tap(
							{ name: PLUGIN_NAME, stage: -100 },
							(statement) => {
								if (sideEffectsStatement) return;
								if (parser.scope.topLevelScope !== true) return;
								switch (statement.type) {
									case "ExpressionStatement":
										if (
											!parser.isPure(
												statement.expression,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "IfStatement":
									case "WhileStatement":
									case "DoWhileStatement":
										if (
											!parser.isPure(
												statement.test,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "ForStatement":
										if (
											!parser.isPure(
												statement.init,
												/** @type {Range} */ (statement.range)[0]
											) ||
											!parser.isPure(
												statement.test,
												statement.init
													? /** @type {Range} */ (statement.init.range)[1]
													: /** @type {Range} */ (statement.range)[0]
											) ||
											!parser.isPure(
												statement.update,
												statement.test
													? /** @type {Range} */ (statement.test.range)[1]
													: statement.init
														? /** @type {Range} */ (statement.init.range)[1]
														: /** @type {Range} */ (statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "SwitchStatement":
										if (
											!parser.isPure(
												statement.discriminant,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "VariableDeclaration":
									case "ClassDeclaration":
									case "FunctionDeclaration":
										if (
											!parser.isPure(
												statement,
												/** @type {Range} */ (statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "ExportNamedDeclaration":
									case "ExportDefaultDeclaration":
										if (
											!parser.isPure(
												statement.declaration,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "LabeledStatement":
									case "BlockStatement":
										// statement hook will be called for child statements too
										break;
									case "EmptyStatement":
										break;
									case "ExportAllDeclaration":
									case "ImportDeclaration":
										// imports will be handled by the dependencies
										break;
									default:
										sideEffectsStatement = statement;
										break;
								}
							}
						);
						parser.hooks.finish.tap(PLUGIN_NAME, () => {
							if (sideEffectsStatement === undefined) {
								/** @type {BuildMeta} */
								(parser.state.module.buildMeta).sideEffectFree = true;
							} else {
								const type = sideEffectsStatement.type;
								const loc = parser.getLocation(sideEffectsStatement);
								moduleGraph
									.getOptimizationBailout(parser.state.module)
									.push(
										() =>
											`Statement (${type}) with side effects in source code at ${formatLocation(
												loc
											)}`
									);
							}
						});
					};

					/**
					 * @param {JavascriptParser} parser the parser
					 * @param {JavascriptParserOptions} parserOptions the parser options
					 * @returns {void}
					 */
					const applyNoSideEffectsNotationHandler = (parser, parserOptions) => {
						/** @type {Set<string> | undefined} */
						let pureFunctions;

						const pureFunctionsFromOption =
							parserOptions &&
							Array.isArray(parserOptions.pureFunctions) &&
							parserOptions.pureFunctions.length > 0
								? new Set(parserOptions.pureFunctions)
								: undefined;

						parser.hooks.program.tap(PLUGIN_NAME, () => {
							pureFunctions = undefined;
						});

						/**
						 * @param {string} name function name
						 */
						const markPure = (name) => {
							if (pureFunctions === undefined) pureFunctions = new Set();
							else if (pureFunctions.has(name)) return;
							parser.tagVariable(name, notSideEffectsTag, {});
							pureFunctions.add(name);
						};

						// Detect on function declarations
						// Covers:
						// 	1. function foo
						//  2. export function foo
						//  3. export default function foo
						// 	4. export default function / export default () => {} (anonymous)
						parser.hooks.preStatementByType
							.for("FunctionDeclaration")
							.tap(PLUGIN_NAME, (statement) => {
								if (parser.scope.topLevelScope !== true) return;
								if (statement.type !== "FunctionDeclaration") {
									return;
								}
								const name = statement.id ? statement.id.name : "default";
								if (
									pureFunctionsFromOption &&
									pureFunctionsFromOption.has(name)
								) {
									markPure(name);
									return;
								}
								const commentsStart = parser.prevStatement
									? /** @type {Range} */ (parser.prevStatement.range)[1]
									: 0;
								if (
									hasNoSideEffectsNotation(
										parser,
										commentsStart,
										/** @type {Range} */ (statement.range)[0]
									)
								) {
									markPure(name);
								}
							});

						// Detect on variable declarations with function init
						parser.hooks.preDeclarator.tap(PLUGIN_NAME, (decl, statement) => {
							if (parser.scope.topLevelScope !== true) return;
							if (decl.id.type !== "Identifier") return;
							if (
								pureFunctionsFromOption &&
								pureFunctionsFromOption.has(decl.id.name)
							) {
								markPure(decl.id.name);
								return;
							}
							if (!decl.init) return;
							if (!decl.init.type.endsWith("FunctionExpression")) return;

							let hasAnnotation = false;
							// Before the VariableDeclaration (only for const)
							if (statement.kind === "const") {
								const commentsStart = parser.prevStatement
									? /** @type {Range} */ (parser.prevStatement.range)[1]
									: 0;
								hasAnnotation = hasNoSideEffectsNotation(
									parser,
									commentsStart,
									/** @type {Range} */ (statement.range)[0]
								);
							}

							if (!hasAnnotation) {
								hasAnnotation = hasNoSideEffectsNotation(
									parser,
									/** @type {Range} */ (decl.id.range)[1],
									/** @type {Range} */ (decl.init.range)[0]
								);
							}
							if (hasAnnotation) {
								markPure(decl.id.name);
							}
						});

						if (pureFunctionsFromOption) {
							parser.hooks.blockPreStatementByType
								.for("ExportDefaultDeclaration")
								.tap(PLUGIN_NAME, (statement) => {
									if (parser.scope.topLevelScope !== true) return;
									if (
										statement.type === "ExportDefaultDeclaration" &&
										pureFunctionsFromOption.has("default")
									) {
										const decl = statement.declaration;
										if (
											decl.type === "ArrowFunctionExpression" ||
											decl.type === "FunctionExpression"
										) {
											markPure("default");
										}
									}
								});
						}

						parser.hooks.isPure
							.for("CallExpression")
							.tap(PLUGIN_NAME, (expression, commentsStartPos) => {
								const expr = /** @type {CallExpression} */ (expression);
								if (expr.callee.type !== "Identifier") return;
								if (!parser.getTagData(expr.callee.name, notSideEffectsTag)) {
									return;
								}
								commentsStartPos = /** @type {Range} */ (expr.callee.range)[1];
								return expr.arguments.every((arg) => {
									if (arg.type === "SpreadElement") return false;
									const pure = parser.isPure(arg, commentsStartPos);
									commentsStartPos = /** @type {Range} */ (arg.range)[1];
									return pure;
								});
							});

						parser.hooks.finish.tap(PLUGIN_NAME, () => {
							if (pureFunctions === undefined || pureFunctions.size === 0) {
								return;
							}
							const buildInfo = /** @type {JavascriptModuleBuildInfo} */ (
								parser.state.module.buildInfo
							);
							if (buildInfo.pureFunctions) {
								for (const fn of pureFunctions) {
									buildInfo.pureFunctions.add(fn);
								}
							} else {
								buildInfo.pureFunctions = pureFunctions;
							}
						});
					};

					for (const key of [
						JAVASCRIPT_MODULE_TYPE_AUTO,
						JAVASCRIPT_MODULE_TYPE_ESM,
						JAVASCRIPT_MODULE_TYPE_DYNAMIC
					]) {
						normalModuleFactory.hooks.parser
							.for(key)
							.tap(PLUGIN_NAME, (parser, parserOptions) => {
								applyNoSideEffectsNotationHandler(parser, parserOptions);
								applySideEffectsStmtHandler(parser);
							});
					}
				}
				compilation.hooks.optimizeDependencies.tap(
					{
						name: PLUGIN_NAME,
						stage: STAGE_DEFAULT
					},
					(modules) => {
						const logger = compilation.getLogger(
							"webpack.SideEffectsFlagPlugin"
						);

						logger.time("update dependencies");

						/** @type {Set<Module>} */
						const optimizedModules = new Set();

						// Only defer builds must protect deferred re-export barrels;
						// skip the per-target check entirely otherwise.
						const deferEnabled =
							compilation.options.experiments.deferImport === true;

						// Re-export resolution is idempotent within a pass, so cache it
						// per export info: a shared barrel imported by many modules
						// resolves each name once instead of once per consumer.
						/** @type {Map<ExportInfo, TargetItemWithConnection | null>} */
						const reexportTargetCache = new Map();

						// Dependencies don't change within the pass, so the passthrough
						// check is cached per module across all moveTarget filter calls.
						/** @type {Map<Module, boolean>} */
						const singleStarReexportCache = new Map();

						/**
						 * Cached variant of moduleHasSingleStarReexport.
						 * @param {Module} module the candidate passthrough module
						 * @returns {boolean} true when the module is a pure single-star passthrough
						 */
						const hasSingleStarReexport = (module) => {
							let result = singleStarReexportCache.get(module);
							if (result === undefined) {
								result = moduleHasSingleStarReexport(module);
								singleStarReexportCache.set(module, result);
							}
							return result;
						};

						/**
						 * Optimize incoming connections.
						 * @param {Module} module module
						 */
						const optimizeIncomingConnections = (module) => {
							if (optimizedModules.has(module)) return;
							optimizedModules.add(module);
							if (module.getSideEffectsConnectionState(moduleGraph) === false) {
								const exportsInfo = moduleGraph.getExportsInfo(module);
								for (const connection of moduleGraph.getIncomingConnections(
									module
								)) {
									const dep = connection.dependency;
									/** @type {boolean} */
									let isReexport;
									if (
										(isReexport =
											dep instanceof
											HarmonyExportImportedSpecifierDependency) ||
										(dep instanceof HarmonyImportSpecifierDependency &&
											!dep.namespaceObjectAsContext)
									) {
										if (connection.originModule !== null) {
											optimizeIncomingConnections(connection.originModule);
										}

										if (isReexport) {
											if (!dep.name && !hasSingleStarReexport(module)) continue;

											const infos = dep.name
												? // Named re-exports resolve their single target here;
													// e.g. `export * as foo from "mod"` / `export { dep as name } from "mod"`
													[
														moduleGraph.getExportInfo(
															/** @type {Module} */ (connection.originModule),
															dep.name
														)
													]
												: moduleGraph.getExportsInfo(
														/** @type {Module} */ (connection.originModule)
													).exports;

											for (const exportInfo of infos) {
												const immediate = exportInfo.getTarget(
													moduleGraph,
													RETURNS_FALSE
												);
												if (
													immediate === undefined ||
													immediate.connection.dependency !== dep
												) {
													continue;
												}

												exportInfo.moveTarget(
													moduleGraph,
													(candidate) =>
														candidate.module.getSideEffectsConnectionState(
															moduleGraph
														) === false &&
														// Keep a deferred re-export's barrel (see below).
														(!deferEnabled ||
															!isDeferredTargetConnection(
																candidate.connection
															)) &&
														(Boolean(dep.name) ||
															hasSingleStarReexport(
																/** @type {Module} */ (candidate.module)
															)),
													({
														module: newModule,
														export: exportName,
														connection: targetConnection
													}) => {
														moduleGraph.updateModule(dep, newModule);
														moduleGraph.updateParent(
															dep,
															targetConnection,
															/** @type {Module} */ (connection.originModule)
														);
														moduleGraph.addExplanation(
															dep,
															"(skipped side-effect-free modules)"
														);
														const ids = dep.getIds(moduleGraph);
														if (ids.length) {
															dep.setIds(
																moduleGraph,
																exportName
																	? [...exportName, ...ids.slice(1)]
																	: ids.slice(1)
															);
														}
														return /** @type {ModuleGraphConnection} */ (
															moduleGraph.getConnection(dep)
														);
													}
												);
											}
											continue;
										}

										const ids = dep.getIds(moduleGraph);
										if (ids.length > 0) {
											const exportInfo = exportsInfo.getExportInfo(ids[0]);
											let target = reexportTargetCache.get(exportInfo);
											if (target === undefined) {
												target =
													exportInfo.getTarget(
														moduleGraph,
														({ module }) =>
															module.getSideEffectsConnectionState(
																moduleGraph
															) === false
													) || null;
												reexportTargetCache.set(exportInfo, target);
											}
											if (!target) continue;

											// A deferred re-export must keep its side-effect-free
											// barrel: collapsing it here would turn the cached
											// deferred namespace (`.z`) into an eager import of the
											// source module, breaking deferred-namespace identity
											// and evaluation semantics.
											if (
												deferEnabled &&
												isDeferredTargetConnection(target.connection)
											) {
												continue;
											}

											moduleGraph.updateModule(dep, target.module);
											moduleGraph.updateParent(
												dep,
												/** @type {ModuleGraphConnection} */ (
													target.connection
												),
												/** @type {Module} */ (connection.originModule)
											);
											moduleGraph.addExplanation(
												dep,
												"(skipped side-effect-free modules)"
											);
											dep.setIds(
												moduleGraph,
												target.export
													? [...target.export, ...ids.slice(1)]
													: ids.slice(1)
											);
										}
									}
								}
							}
						};

						for (const module of modules) {
							optimizeIncomingConnections(module);
						}
						moduleGraph.finishUpdateParent();
						logger.timeEnd("update dependencies");
					}
				);
			}
		);
	}

	/**
	 * Module has side effects.
	 * @param {string} moduleName the module name
	 * @param {SideEffectsFlagValue} flagValue the flag value
	 * @param {CacheItem} cache cache for glob to regexp
	 * @returns {boolean | undefined} true, when the module has side effects, undefined or false when not
	 */
	static moduleHasSideEffects(moduleName, flagValue, cache) {
		switch (typeof flagValue) {
			case "undefined":
				return true;
			case "boolean":
				return flagValue;
			case "string":
				return globToRegexp(flagValue, cache).test(moduleName);
			case "object":
				return flagValue.some((glob) =>
					SideEffectsFlagPlugin.moduleHasSideEffects(moduleName, glob, cache)
				);
		}
	}
}

module.exports = SideEffectsFlagPlugin;
