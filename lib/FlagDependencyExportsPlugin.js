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
/** @typedef {import("./Module")} Module */

const addToSet = (a, b) => {
	let changed = false;
	for (const item of b) {
		if (!a.has(item)) {
			a.add(item);
			changed = true;
		}
	}
	return changed;
};

const getCacheIdentifier = (compilation, module) => {
	return `${
		compilation.compilerPath
	}/FlagDependencyExportsPlugin/${module.identifier()}`;
};

class FlagDependencyExportsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FlagDependencyExportsPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.finishModules.tapAsync(
					"FlagDependencyExportsPlugin",
					(modules, callback) => {
						/** @type {Queue<Module>} */
						const queue = new Queue();

						// Step 1: Try to restore cached provided export info from cache
						asyncLib.each(
							modules,
							(module, callback) => {
								if (
									module.buildInfo.cacheable !== true ||
									typeof module.buildInfo.hash !== "string"
								) {
									// Enqueue uncacheable module for determining the exports
									queue.enqueue(module);
									return callback();
								}
								compilation.cache.get(
									getCacheIdentifier(compilation, module),
									module.buildInfo.hash,
									(err, result) => {
										if (err) return callback(err);

										if (result !== undefined) {
											moduleGraph.setProvidedExports(module, result);
										} else {
											// Without cached info enqueue module for determining the exports
											queue.enqueue(module);
										}
										callback();
									}
								);
							},
							err => {
								if (err) return callback(err);

								/** @type {Set<Module>} */
								const modulesToStore = new Set();

								/** @type {Map<Module, Set<Module>>} */
								const dependencies = new Map();

								/** @type {Module} */
								let module;
								/** @type {Set<string> | true} */
								let moduleProvidedExports;
								let providedExportsAreCacheable = true;

								/**
								 * @param {DependenciesBlock} depBlock the dependencies block
								 * @returns {boolean} true if the traversal must be continued
								 */
								const processDependenciesBlock = depBlock => {
									for (const dep of depBlock.dependencies) {
										if (processDependency(dep)) {
											return true;
										}
									}
									for (const block of depBlock.blocks) {
										if (processDependenciesBlock(block)) {
											return true;
										}
									}
									return false;
								};

								/**
								 * @param {Dependency} dep the dependency
								 * @returns {boolean} true if the traversal must be continued
								 */
								const processDependency = dep => {
									const exportDesc = dep.getExports(moduleGraph);
									if (!exportDesc) return;
									const exports = exportDesc.exports;
									// break early if it's only in the worst state
									if (moduleProvidedExports === true) {
										return true;
									}
									// break if it should move to the worst state
									if (exports === true) {
										moduleProvidedExports = true;
										notifyDependencies();
										return true;
									}
									// merge in new exports
									if (Array.isArray(exports)) {
										if (addToSet(moduleProvidedExports, exports)) {
											notifyDependencies();
										}
									}
									// store dependencies
									const exportDeps = exportDesc.dependencies;
									if (exportDeps) {
										providedExportsAreCacheable = false;
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
									return false;
								};

								const notifyDependencies = () => {
									const deps = dependencies.get(module);
									if (deps !== undefined) {
										for (const dep of deps) {
											queue.enqueue(dep);
										}
									}
								};

								while (queue.length > 0) {
									module = queue.dequeue();

									const providedExports = moduleGraph.getProvidedExports(
										module
									);
									if (providedExports !== true) {
										if (!module.buildMeta || !module.buildMeta.exportsType) {
											// It's a module without declared exports
											moduleGraph.setProvidedExports(module, true);
											modulesToStore.add(module);
											notifyDependencies();
										} else {
											// It's a module with declared exports
											moduleProvidedExports = /** @type {Set<string> | true} */ (Array.isArray(
												providedExports
											)
												? new Set(providedExports)
												: new Set());
											providedExportsAreCacheable = true;

											processDependenciesBlock(module);

											if (providedExportsAreCacheable) {
												modulesToStore.add(module);
											}

											moduleGraph.setProvidedExports(
												module,
												moduleProvidedExports === true
													? true
													: Array.from(moduleProvidedExports)
											);
										}
									}
								}

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
										compilation.cache.store(
											getCacheIdentifier(compilation, module),
											module.buildInfo.hash,
											moduleGraph.getProvidedExports(module),
											callback
										);
									},
									callback
								);
							}
						);
					}
				);

				/** @type {WeakMap<Module, true | string[] | null>} */
				const providedExportsCache = new WeakMap();
				compilation.hooks.rebuildModule.tap(
					"FlagDependencyExportsPlugin",
					module => {
						providedExportsCache.set(
							module,
							moduleGraph.getProvidedExports(module)
						);
					}
				);
				compilation.hooks.finishRebuildingModule.tap(
					"FlagDependencyExportsPlugin",
					module => {
						moduleGraph.setProvidedExports(
							module,
							providedExportsCache.get(module)
						);
					}
				);
			}
		);
	}
}

module.exports = FlagDependencyExportsPlugin;
