/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const Queue = require("./util/Queue");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Dependency").ExportSpec} ExportSpec */
/** @typedef {import("./Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("./ExportsInfo")} ExportsInfo */
/** @typedef {import("./Module")} Module */

class FlagDependencyExportsPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagDependencyExportsPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				const cache = compilation.getCache("FlagDependencyExportsPlugin");
				compilation.hooks.finishModules.tapAsync(
					"FlagDependencyExportsPlugin",
					(modules, callback) => {
						const logger = compilation.getLogger(
							"webpack.FlagDependencyExportsPlugin"
						);
						let statRestoredFromCache = 0;
						let statFlaggedUncached = 0;
						let statNotCached = 0;
						let statQueueItemsProcessed = 0;

						/** @type {Queue<Module>} */
						const queue = new Queue();

						// Step 1: Try to restore cached provided export info from cache
						logger.time("restore cached provided exports");
						asyncLib.each(
							modules,
							(module, callback) => {
								if (
									module.buildInfo.cacheable !== true ||
									typeof module.buildInfo.hash !== "string"
								) {
									statFlaggedUncached++;
									// Enqueue uncacheable module for determining the exports
									queue.enqueue(module);
									moduleGraph.getExportsInfo(module).setHasProvideInfo();
									return callback();
								}
								cache.get(
									module.identifier(),
									module.buildInfo.hash,
									(err, result) => {
										if (err) return callback(err);

										if (result !== undefined) {
											statRestoredFromCache++;
											moduleGraph
												.getExportsInfo(module)
												.restoreProvided(result);
										} else {
											statNotCached++;
											// Without cached info enqueue module for determining the exports
											queue.enqueue(module);
											moduleGraph.getExportsInfo(module).setHasProvideInfo();
										}
										callback();
									}
								);
							},
							err => {
								logger.timeEnd("restore cached provided exports");
								if (err) return callback(err);

								/** @type {Set<Module>} */
								const modulesToStore = new Set();

								/** @type {Map<Module, Set<Module>>} */
								const dependencies = new Map();

								/** @type {Module} */
								let module;

								/** @type {ExportsInfo} */
								let exportsInfo;

								/** @type {Map<Dependency, ExportsSpec>} */
								const exportsSpecsFromDependencies = new Map();

								let cacheable = true;
								let changed = false;

								/**
								 * @param {DependenciesBlock} depBlock the dependencies block
								 * @returns {void}
								 */
								const processDependenciesBlock = depBlock => {
									for (const dep of depBlock.dependencies) {
										processDependency(dep);
									}
									for (const block of depBlock.blocks) {
										processDependenciesBlock(block);
									}
								};

								/**
								 * @param {Dependency} dep the dependency
								 * @returns {void}
								 */
								const processDependency = dep => {
									const exportDesc = dep.getExports(moduleGraph);
									if (!exportDesc) return;
									exportsSpecsFromDependencies.set(dep, exportDesc);
								};

								/**
								 * @param {Dependency} dep dependency
								 * @param {ExportsSpec} exportDesc info
								 * @returns {void}
								 */
								const processExportsSpec = (dep, exportDesc) => {
									const exports = exportDesc.exports;
									const globalCanMangle = exportDesc.canMangle;
									const globalFrom = exportDesc.from;
									const globalPriority = exportDesc.priority;
									const globalTerminalBinding =
										exportDesc.terminalBinding || false;
									const exportDeps = exportDesc.dependencies;
									if (exportDesc.hideExports) {
										for (const name of exportDesc.hideExports) {
											const exportInfo = exportsInfo.getExportInfo(name);
											exportInfo.unsetTarget(dep);
										}
									}
									if (exports === true) {
										// unknown exports
										if (
											exportsInfo.setUnknownExportsProvided(
												globalCanMangle,
												exportDesc.excludeExports,
												globalFrom && dep,
												globalFrom,
												globalPriority
											)
										) {
											changed = true;
										}
									} else if (Array.isArray(exports)) {
										/**
										 * merge in new exports
										 * @param {ExportsInfo} exportsInfo own exports info
										 * @param {(ExportSpec | string)[]} exports list of exports
										 */
										const mergeExports = (exportsInfo, exports) => {
											for (const exportNameOrSpec of exports) {
												let name;
												let canMangle = globalCanMangle;
												let terminalBinding = globalTerminalBinding;
												let exports = undefined;
												let from = globalFrom;
												let fromExport = undefined;
												let priority = globalPriority;
												let hidden = false;
												if (typeof exportNameOrSpec === "string") {
													name = exportNameOrSpec;
												} else {
													name = exportNameOrSpec.name;
													if (exportNameOrSpec.canMangle !== undefined)
														canMangle = exportNameOrSpec.canMangle;
													if (exportNameOrSpec.export !== undefined)
														fromExport = exportNameOrSpec.export;
													if (exportNameOrSpec.exports !== undefined)
														exports = exportNameOrSpec.exports;
													if (exportNameOrSpec.from !== undefined)
														from = exportNameOrSpec.from;
													if (exportNameOrSpec.priority !== undefined)
														priority = exportNameOrSpec.priority;
													if (exportNameOrSpec.terminalBinding !== undefined)
														terminalBinding = exportNameOrSpec.terminalBinding;
													if (exportNameOrSpec.hidden !== undefined)
														hidden = exportNameOrSpec.hidden;
												}
												const exportInfo = exportsInfo.getExportInfo(name);

												if (
													exportInfo.provided === false ||
													exportInfo.provided === null
												) {
													exportInfo.provided = true;
													changed = true;
												}

												if (
													exportInfo.canMangleProvide !== false &&
													canMangle === false
												) {
													exportInfo.canMangleProvide = false;
													changed = true;
												}

												if (terminalBinding && !exportInfo.terminalBinding) {
													exportInfo.terminalBinding = true;
													changed = true;
												}

												if (exports) {
													const nestedExportsInfo = exportInfo.createNestedExportsInfo();
													mergeExports(nestedExportsInfo, exports);
												}

												if (
													from &&
													(hidden
														? exportInfo.unsetTarget(dep)
														: exportInfo.setTarget(
																dep,
																from,
																fromExport === undefined ? [name] : fromExport,
																priority
														  ))
												) {
													changed = true;
												}

												// Recalculate target exportsInfo
												const target = exportInfo.getTarget(moduleGraph);
												let targetExportsInfo = undefined;
												if (target) {
													const targetModuleExportsInfo = moduleGraph.getExportsInfo(
														target.module
													);
													targetExportsInfo = targetModuleExportsInfo.getNestedExportsInfo(
														target.export
													);
													// add dependency for this module
													const set = dependencies.get(target.module);
													if (set === undefined) {
														dependencies.set(target.module, new Set([module]));
													} else {
														set.add(module);
													}
												}

												if (exportInfo.exportsInfoOwned) {
													if (
														exportInfo.exportsInfo.setRedirectNamedTo(
															targetExportsInfo
														)
													) {
														changed = true;
													}
												} else if (
													exportInfo.exportsInfo !== targetExportsInfo
												) {
													exportInfo.exportsInfo = targetExportsInfo;
													changed = true;
												}
											}
										};
										mergeExports(exportsInfo, exports);
									}
									// store dependencies
									if (exportDeps) {
										cacheable = false;
										for (const exportDependency of exportDeps) {
											// add dependency for this module
											const set = dependencies.get(exportDependency);
											if (set === undefined) {
												dependencies.set(exportDependency, new Set([module]));
											} else {
												set.add(module);
											}
										}
									}
								};

								const notifyDependencies = () => {
									const deps = dependencies.get(module);
									if (deps !== undefined) {
										for (const dep of deps) {
											queue.enqueue(dep);
										}
									}
								};

								logger.time("figure out provided exports");
								while (queue.length > 0) {
									module = queue.dequeue();

									statQueueItemsProcessed++;

									exportsInfo = moduleGraph.getExportsInfo(module);
									if (!module.buildMeta || !module.buildMeta.exportsType) {
										if (exportsInfo.otherExportsInfo.provided !== null) {
											// It's a module without declared exports
											exportsInfo.setUnknownExportsProvided();
											modulesToStore.add(module);
											notifyDependencies();
										}
									} else {
										// It's a module with declared exports

										cacheable = true;
										changed = false;

										exportsSpecsFromDependencies.clear();
										moduleGraph.freeze();
										processDependenciesBlock(module);
										moduleGraph.unfreeze();
										for (const [
											dep,
											exportsSpec
										] of exportsSpecsFromDependencies) {
											processExportsSpec(dep, exportsSpec);
										}

										if (cacheable) {
											modulesToStore.add(module);
										}

										if (changed) {
											notifyDependencies();
										}
									}
								}
								logger.timeEnd("figure out provided exports");

								logger.log(
									`${Math.round(
										100 -
											(100 * statRestoredFromCache) /
												(statRestoredFromCache +
													statNotCached +
													statFlaggedUncached)
									)}% of exports of modules have been determined (${statNotCached} not cached, ${statFlaggedUncached} flagged uncacheable, ${statRestoredFromCache} from cache, ${
										statQueueItemsProcessed -
										statNotCached -
										statFlaggedUncached
									} additional calculations due to dependencies)`
								);

								logger.time("store provided exports into cache");
								asyncLib.each(
									modulesToStore,
									(module, callback) => {
										if (
											module.buildInfo.cacheable !== true ||
											typeof module.buildInfo.hash !== "string"
										) {
											// not cacheable
											return callback();
										}
										cache.store(
											module.identifier(),
											module.buildInfo.hash,
											moduleGraph
												.getExportsInfo(module)
												.getRestoreProvidedData(),
											callback
										);
									},
									err => {
										logger.timeEnd("store provided exports into cache");
										callback(err);
									}
								);
							}
						);
					}
				);

				/** @type {WeakMap<Module, any>} */
				const providedExportsCache = new WeakMap();
				compilation.hooks.rebuildModule.tap(
					"FlagDependencyExportsPlugin",
					module => {
						providedExportsCache.set(
							module,
							moduleGraph.getExportsInfo(module).getRestoreProvidedData()
						);
					}
				);
				compilation.hooks.finishRebuildingModule.tap(
					"FlagDependencyExportsPlugin",
					module => {
						moduleGraph
							.getExportsInfo(module)
							.restoreProvided(providedExportsCache.get(module));
					}
				);
			}
		);
	}
}

module.exports = FlagDependencyExportsPlugin;
