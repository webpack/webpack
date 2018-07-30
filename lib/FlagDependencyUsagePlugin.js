/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_DEFAULT } = require("./OptimizationStages");
const SortableSet = require("./util/SortableSet");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */

/** @typedef {false | true | SortableSet<string>} UsedExports */

/**
 * @param {UsedExports} moduleUsedExports the current used exports of the module
 * @param {false | true | string[]} newUsedExports the new used exports
 * @returns {boolean} true, if the newUsedExports is part of the moduleUsedExports
 */
const isContained = (moduleUsedExports, newUsedExports) => {
	if (moduleUsedExports === null) return false;
	if (moduleUsedExports === true) return true;
	if (newUsedExports === true) return false;
	if (newUsedExports === false) return true;
	if (moduleUsedExports === false) return false;
	if (newUsedExports.length > moduleUsedExports.size) return false;
	return newUsedExports.every(item => moduleUsedExports.has(item));
};

class FlagDependencyUsagePlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FlagDependencyUsagePlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(
				/** @type {TODO} */ ({
					name: "FlagDependencyUsagePlugin",
					stage: STAGE_DEFAULT
				}),
				modules => {
					/**
					 *
					 * @param {Module} module module to process
					 * @param {boolean | string[]} usedExports list of used exports
					 * @returns {void}
					 */
					const processModule = (module, usedExports) => {
						let ue = module.getUsedExports(moduleGraph);
						if (ue === true) return;
						if (usedExports === true) {
							module.setUsedExports(moduleGraph, (ue = true));
						} else if (Array.isArray(usedExports)) {
							if (!ue) {
								module.setUsedExports(
									moduleGraph,
									(ue = new SortableSet(usedExports))
								);
							} else {
								const old = ue ? ue.size : -1;
								for (const exportName of usedExports) {
									ue.add(exportName);
								}
								if (ue.size === old) {
									return;
								}
							}
						} else {
							if (ue !== false) return;
							module.setUsedExports(moduleGraph, (ue = new SortableSet()));
						}

						// for a module without side effects we stop tracking usage here when no export is used
						// This module won't be evaluated in this case
						if (module.factoryMeta.sideEffectFree) {
							if (ue !== true && ue.size === 0) return;
						}

						queue.push([module, module, ue]);
					};

					/**
					 * @param {Module} module the module
					 * @param {DependenciesBlock} depBlock the dependencies block
					 * @param {UsedExports} usedExports the used exports
					 * @returns {void}
					 */
					const processDependenciesBlock = (module, depBlock, usedExports) => {
						for (const dep of depBlock.dependencies) {
							processDependency(module, dep);
						}
						for (const block of depBlock.blocks) {
							queue.push([module, block, usedExports]);
						}
					};

					/**
					 * @param {Module} module the module
					 * @param {Dependency} dep the dependency
					 * @returns {void}
					 */
					const processDependency = (module, dep) => {
						const reference = compilation.getDependencyReference(module, dep);
						if (!reference) return;
						const referenceModule = reference.module;
						const importedNames = reference.importedNames;
						const oldUsedExports = referenceModule.getUsedExports(moduleGraph);
						if (
							!oldUsedExports ||
							!isContained(oldUsedExports, importedNames)
						) {
							processModule(referenceModule, importedNames);
						}
					};

					for (const module of modules) {
						module.setUsedExports(moduleGraph, false);
					}

					/** @type {[Module, DependenciesBlock, UsedExports][]} */
					const queue = [];
					for (const [, deps] of compilation.entryDependencies) {
						const lastDependency = deps[deps.length - 1];
						if (lastDependency) {
							const module = moduleGraph.getModule(lastDependency);
							if (module) {
								processModule(module, true);
							}
						}
					}

					while (queue.length) {
						const queueItem = queue.pop();
						processDependenciesBlock(queueItem[0], queueItem[1], queueItem[2]);
					}
				}
			);
		});
	}
}

module.exports = FlagDependencyUsagePlugin;
