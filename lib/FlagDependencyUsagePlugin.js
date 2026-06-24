/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("./Dependency");
const { UsageState } = require("./ExportsInfo");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const { STAGE_DEFAULT } = require("./OptimizationStages");
const ArrayQueue = require("./util/ArrayQueue");
const TupleQueue = require("./util/TupleQueue");
const { getEntryRuntime, mergeRuntimeOwned } = require("./util/runtime");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("./Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("./ExportsInfo")} ExportsInfo */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

const {
	NO_EXPORTS_REFERENCED,
	EXPORTS_OBJECT_REFERENCED,
	EXPORTS_OBJECT_REFERENCED_MANGLEABLE
} = Dependency;

const PLUGIN_NAME = "FlagDependencyUsagePlugin";
const PLUGIN_LOGGER_NAME = `webpack.${PLUGIN_NAME}`;

class FlagDependencyUsagePlugin {
	/**
	 * Creates an instance of FlagDependencyUsagePlugin.
	 * @param {boolean} global do a global analysis instead of per runtime
	 * @param {boolean=} mangleEscapingNamespaces keep exports mangleable when a module's namespace object escapes
	 */
	constructor(global, mangleEscapingNamespaces = false) {
		/** @type {boolean} */
		this.global = global;
		/** @type {boolean} */
		this.mangleEscapingNamespaces = mangleEscapingNamespaces;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(
				{ name: PLUGIN_NAME, stage: STAGE_DEFAULT },
				(modules) => {
					if (compilation.moduleMemCaches) {
						throw new Error(
							"optimization.usedExports can't be used with cacheUnaffected as export usage is a global effect"
						);
					}

					const logger = compilation.getLogger(PLUGIN_LOGGER_NAME);
					/** @type {Map<ExportsInfo, Module>} */
					const exportInfoToModuleMap = new Map();

					/** @type {TupleQueue<Module, RuntimeSpec>} */
					const queue = new TupleQueue();

					/**
					 * Process referenced module.
					 * @param {Module} module module to process
					 * @param {ReferencedExports} usedExports list of used exports
					 * @param {RuntimeSpec} runtime part of which runtime
					 * @param {boolean} forceSideEffects always apply side effects
					 * @returns {void}
					 */
					const processReferencedModule = (
						module,
						usedExports,
						runtime,
						forceSideEffects
					) => {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						if (usedExports === EXPORTS_OBJECT_REFERENCED_MANGLEABLE) {
							// The whole namespace object escapes via a reference that codegen
							// can materialize as a decoupled namespace object. When all exports
							// are statically known we keep them mangleable instead of marking
							// them used-in-unknown-way.
							if (
								this.mangleEscapingNamespaces &&
								module.buildMeta &&
								module.buildMeta.exportsType === "namespace" &&
								exportsInfo.otherExportsInfo.provided === false
							) {
								let changed = exportsInfo.setAllKnownExportsUsed(runtime);
								// The whole namespace object is observed as a value, so the
								// module must stay a real ES module namespace at runtime
								// (keep __esModule / the namespace object, i.e. `r()`).
								if (
									exportsInfo
										.getExportInfo("__esModule")
										.setUsed(UsageState.Used, runtime)
								) {
									changed = true;
								}
								// Exports must keep a real binding (not be inlined) so member
								// access on the namespace has ES namespace semantics, e.g.
								// `delete ns.x` hits a non-configurable property and throws.
								for (const exportInfo of exportsInfo.ownedExports) {
									exportInfo.canInlineUse = false;
								}
								if (changed) {
									queue.enqueue(module, runtime);
								}
							} else if (exportsInfo.setUsedInUnknownWay(runtime)) {
								queue.enqueue(module, runtime);
							}
							return;
						}
						if (usedExports.length > 0) {
							if (!module.buildMeta || !module.buildMeta.exportsType) {
								if (exportsInfo.setUsedWithoutInfo(runtime)) {
									queue.enqueue(module, runtime);
								}
								return;
							}
							for (const usedExportInfo of usedExports) {
								/** @type {string[]} */
								let usedExport;
								let canMangle = true;
								let canInline = true;
								if (Array.isArray(usedExportInfo)) {
									usedExport = usedExportInfo;
								} else {
									usedExport = usedExportInfo.name;
									canMangle = usedExportInfo.canMangle !== false;
									canInline = usedExportInfo.canInline !== false;
								}
								if (usedExport.length === 0) {
									if (exportsInfo.setUsedInUnknownWay(runtime)) {
										queue.enqueue(module, runtime);
									}
								} else {
									let currentExportsInfo = exportsInfo;
									for (let i = 0; i < usedExport.length; i++) {
										const exportInfo = currentExportsInfo.getExportInfo(
											usedExport[i]
										);
										if (canMangle === false) {
											exportInfo.canMangleUse = false;
										}

										if (exportInfo.canInlineUse === undefined) {
											exportInfo.canInlineUse = canInline;
										} else if (!canInline) {
											exportInfo.canInlineUse = false;
										}
										const lastOne = i === usedExport.length - 1;
										if (!lastOne) {
											const nestedInfo = exportInfo.getNestedExportsInfo();
											if (nestedInfo) {
												if (
													exportInfo.setUsedConditionally(
														(used) => used === UsageState.Unused,
														UsageState.OnlyPropertiesUsed,
														runtime
													)
												) {
													const currentModule =
														currentExportsInfo === exportsInfo
															? module
															: exportInfoToModuleMap.get(currentExportsInfo);
													if (currentModule) {
														queue.enqueue(currentModule, runtime);
													}
												}
												currentExportsInfo = nestedInfo;
												continue;
											}
										}
										if (
											exportInfo.setUsedConditionally(
												(v) => v !== UsageState.Used,
												UsageState.Used,
												runtime
											)
										) {
											const currentModule =
												currentExportsInfo === exportsInfo
													? module
													: exportInfoToModuleMap.get(currentExportsInfo);
											if (currentModule) {
												queue.enqueue(currentModule, runtime);
											}
										}
										break;
									}
								}
							}
						} else {
							// for a module without side effects we stop tracking usage here when no export is used
							// This module won't be evaluated in this case
							// TODO webpack 6 remove this check
							if (
								!forceSideEffects &&
								module.factoryMeta !== undefined &&
								module.factoryMeta.sideEffectFree
							) {
								return;
							}
							if (exportsInfo.setUsedForSideEffectsOnly(runtime)) {
								queue.enqueue(module, runtime);
							}
						}
					};

					/**
					 * Processes the provided module.
					 * @param {DependenciesBlock} module the module
					 * @param {RuntimeSpec} runtime part of which runtime
					 * @param {boolean} forceSideEffects always apply side effects
					 * @returns {void}
					 */
					const processModule = (module, runtime, forceSideEffects) => {
						/** @typedef {Map<string, string[] | ReferencedExport>} ExportMaps */
						/** @type {Map<Module, ReferencedExports | ExportMaps>} */
						const map = new Map();
						// Modules whose whole namespace object escapes in a mangleable way.
						// Tracked separately so specific member references are still merged
						// (and marked used) instead of being dropped by the escape marker.
						/** @type {Set<Module>} */
						const mangleableEscapeModules = new Set();

						/** @type {ArrayQueue<DependenciesBlock>} */
						const queue = new ArrayQueue();
						queue.enqueue(module);
						for (;;) {
							const block = queue.dequeue();
							if (block === undefined) break;
							for (const b of block.blocks) {
								if (b.groupOptions && b.groupOptions.entryOptions) {
									processModule(
										b,
										this.global
											? undefined
											: b.groupOptions.entryOptions.runtime || undefined,
										true
									);
								} else {
									queue.enqueue(b);
								}
							}
							for (const dep of block.dependencies) {
								const connection = moduleGraph.getConnection(dep);
								if (!connection || !connection.module) {
									continue;
								}
								const activeState = connection.getActiveState(runtime);
								if (activeState === false) continue;
								const { module } = connection;
								if (activeState === ModuleGraphConnection.TRANSITIVE_ONLY) {
									processModule(module, runtime, false);
									continue;
								}
								const oldReferencedExports = map.get(module);
								if (oldReferencedExports === EXPORTS_OBJECT_REFERENCED) {
									continue;
								}
								const referencedExports =
									compilation.getDependencyReferencedExports(dep, runtime);
								// The non-mangleable whole-object reference is the most
								// conservative result and always wins.
								if (referencedExports === EXPORTS_OBJECT_REFERENCED) {
									map.set(module, EXPORTS_OBJECT_REFERENCED);
									mangleableEscapeModules.delete(module);
									continue;
								}
								// A mangleable whole-object escape keeps the module's exports
								// mangleable (applied after the merge). Unlike the conservative
								// marker it must not drop specific member references: those still
								// need their own (possibly non-existent) export marked used so
								// they render as a qualified access, not a bare `undefined`.
								if (
									referencedExports === EXPORTS_OBJECT_REFERENCED_MANGLEABLE
								) {
									mangleableEscapeModules.add(module);
									continue;
								}
								if (
									oldReferencedExports === undefined ||
									oldReferencedExports === NO_EXPORTS_REFERENCED
								) {
									map.set(module, referencedExports);
								} else if (
									oldReferencedExports !== undefined &&
									referencedExports === NO_EXPORTS_REFERENCED
								) {
									continue;
								} else {
									/** @type {undefined | ExportMaps} */
									let exportsMap;
									if (Array.isArray(oldReferencedExports)) {
										exportsMap = new Map();
										for (const item of oldReferencedExports) {
											if (Array.isArray(item)) {
												exportsMap.set(item.join("\n"), item);
											} else {
												exportsMap.set(item.name.join("\n"), item);
											}
										}
										map.set(module, exportsMap);
									} else {
										exportsMap = oldReferencedExports;
									}
									for (const item of referencedExports) {
										if (Array.isArray(item)) {
											const key = item.join("\n");
											const oldItem = exportsMap.get(key);
											if (oldItem === undefined) {
												exportsMap.set(key, item);
											}
											// if oldItem is already an array we have to do nothing
											// if oldItem is an ReferencedExport object, we don't have to do anything
											// as canMangle defaults to true for arrays
										} else {
											const key = item.name.join("\n");
											const oldItem = exportsMap.get(key);
											if (oldItem === undefined || Array.isArray(oldItem)) {
												exportsMap.set(key, item);
											} else {
												exportsMap.set(key, {
													name: item.name,
													canMangle: item.canMangle && oldItem.canMangle,
													canInline: item.canInline && oldItem.canInline
												});
											}
										}
									}
								}
							}
						}

						for (const [module, referencedExports] of map) {
							if (Array.isArray(referencedExports)) {
								processReferencedModule(
									module,
									referencedExports,
									runtime,
									forceSideEffects
								);
							} else {
								processReferencedModule(
									module,
									[...referencedExports.values()],
									runtime,
									forceSideEffects
								);
							}
						}
						for (const module of mangleableEscapeModules) {
							processReferencedModule(
								module,
								EXPORTS_OBJECT_REFERENCED_MANGLEABLE,
								runtime,
								forceSideEffects
							);
						}
					};

					logger.time("initialize exports usage");
					for (const module of modules) {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						exportInfoToModuleMap.set(exportsInfo, module);
						exportsInfo.setHasUseInfo();
					}
					logger.timeEnd("initialize exports usage");

					logger.time("trace exports usage in graph");

					/**
					 * Process entry dependency.
					 * @param {Dependency} dep dependency
					 * @param {RuntimeSpec} runtime runtime
					 */
					const processEntryDependency = (dep, runtime) => {
						const module = moduleGraph.getModule(dep);
						if (module) {
							processReferencedModule(
								module,
								NO_EXPORTS_REFERENCED,
								runtime,
								true
							);
						}
					};
					/** @type {RuntimeSpec} */
					let globalRuntime;
					for (const [
						entryName,
						{ dependencies: deps, includeDependencies: includeDeps, options }
					] of compilation.entries) {
						const runtime = this.global
							? undefined
							: getEntryRuntime(compilation, entryName, options);
						for (const dep of deps) {
							processEntryDependency(dep, runtime);
						}
						for (const dep of includeDeps) {
							processEntryDependency(dep, runtime);
						}
						globalRuntime = mergeRuntimeOwned(globalRuntime, runtime);
					}
					for (const dep of compilation.globalEntry.dependencies) {
						processEntryDependency(dep, globalRuntime);
					}
					for (const dep of compilation.globalEntry.includeDependencies) {
						processEntryDependency(dep, globalRuntime);
					}

					while (queue.length) {
						const [module, runtime] = /** @type {[Module, RuntimeSpec]} */ (
							queue.dequeue()
						);
						processModule(module, runtime, false);
					}
					logger.timeEnd("trace exports usage in graph");
				}
			);
		});
	}
}

module.exports = FlagDependencyUsagePlugin;
