/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_DEFAULT } = require("./OptimizationStages");
const Queue = require("./util/Queue");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */

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
						const exportsInfo = moduleGraph.getExportsInfo(module);
						let changed = false;
						if (usedExports === true) {
							changed = exportsInfo.setUsedInUnknownWay();
						} else if (usedExports) {
							for (const exportName of usedExports) {
								const exportInfo = exportsInfo.getExportInfo(exportName);
								if (exportInfo.used !== true) {
									exportInfo.used = true;
									changed = true;
								}
							}
						} else {
							// for a module without side effects we stop tracking usage here when no export is used
							// This module won't be evaluated in this case
							if (module.factoryMeta.sideEffectFree) return;
							changed = exportsInfo.setUsedForSideEffectsOnly();
						}

						if (changed) {
							queue.enqueue(module);
						}
					};

					/**
					 * @param {DependenciesBlock} depBlock the dependencies block
					 * @returns {void}
					 */
					const processDependenciesBlock = depBlock => {
						for (const dep of depBlock.dependencies) {
							processDependency(dep);
						}
						for (const block of depBlock.blocks) {
							queue.enqueue(block);
						}
					};

					/**
					 * @param {Dependency} dep the dependency
					 * @returns {void}
					 */
					const processDependency = dep => {
						const reference = compilation.getDependencyReference(dep);
						if (!reference) return;
						const referenceModule = reference.module;
						const importedNames = reference.importedNames;
						processModule(referenceModule, importedNames);
					};

					for (const module of modules) {
						moduleGraph.getExportsInfo(module).setHasUseInfo();
					}

					/** @type {Queue<DependenciesBlock>} */
					const queue = new Queue();

					for (const deps of compilation.entryDependencies.values()) {
						for (const dep of deps) {
							const module = moduleGraph.getModule(dep);
							if (module) {
								processModule(module, true);
							}
						}
					}

					while (queue.length) {
						const depBlock = queue.dequeue();
						processDependenciesBlock(depBlock);
					}
				}
			);
		});
	}
}

module.exports = FlagDependencyUsagePlugin;
