/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

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
				compilation.hooks.finishModules.tap(
					"FlagDependencyExportsPlugin",
					modules => {
						/** @type {Map<Module, Set<Module>>} */
						const dependencies = new Map();
						/** @type {Queue<Module>} */
						const queue = new Queue();
						/** @type {WeakSet<Module>} */
						const temporaryProvidedExports = new WeakSet();

						let module;
						let moduleWithExports;
						let moduleProvidedExports;
						let providedExportsAreTemporary = false;

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
							moduleWithExports = true;
							const exports = exportDesc.exports;
							// break early if it's only in the worst state
							if (moduleGraph.getProvidedExports(module) === true) {
								return true;
							}
							// break if it should move to the worst state
							if (exports === true) {
								moduleGraph.setProvidedExports(module, true);
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
								providedExportsAreTemporary = true;
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

						// Start with all modules without provided exports
						for (const module of modules) {
							if (temporaryProvidedExports.has(module)) {
								// Clear exports when they are temporary and recreate them
								moduleGraph.setProvidedExports(module, null);
								queue.enqueue(module);
							} else if (!moduleGraph.getProvidedExports(module)) {
								queue.enqueue(module);
							}
						}

						while (queue.length > 0) {
							module = queue.dequeue();

							const providedExports = moduleGraph.getProvidedExports(module);
							if (providedExports !== true) {
								moduleWithExports =
									module.buildMeta && module.buildMeta.exportsType;
								moduleProvidedExports = Array.isArray(providedExports)
									? new Set(providedExports)
									: new Set();
								providedExportsAreTemporary = false;

								processDependenciesBlock(module);

								if (providedExportsAreTemporary) {
									temporaryProvidedExports.add(module);
								} else {
									temporaryProvidedExports.delete(module);
								}

								if (!moduleWithExports) {
									moduleGraph.setProvidedExports(module, true);
									notifyDependencies();
								} else if (moduleGraph.getProvidedExports(module) !== true) {
									moduleGraph.setProvidedExports(
										module,
										Array.from(moduleProvidedExports)
									);
								}
							}
						}
					}
				);

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
