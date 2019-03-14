/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("./ModuleGraph");
const { STAGE_DEFAULT } = require("./OptimizationStages");
const Queue = require("./util/Queue");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph").ExportsInfo} ExportsInfo */

const NS_OBJ_USED = [[]];
const NOTHING_USED = [];

class FlagDependencyUsagePlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FlagDependencyUsagePlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(
				{
					name: "FlagDependencyUsagePlugin",
					stage: STAGE_DEFAULT
				},
				modules => {
					/** @type {Map<ExportsInfo, Module>} */
					const exportInfoToModuleMap = new Map();

					/**
					 * @typedef {string[]} StringArray
					 * @param {Module} module module to process
					 * @param {StringArray[]} usedExports list of used exports
					 * @returns {void}
					 */
					const processModule = (module, usedExports) => {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						if (usedExports.length > 0) {
							for (const usedExport of usedExports) {
								if (usedExport.length === 0) {
									if (exportsInfo.setUsedInUnknownWay()) {
										queue.enqueue(module);
									}
								} else {
									if (
										usedExport[0] === "default" &&
										module.buildMeta.exportsType === "named"
									) {
										if (exportsInfo.setUsedAsNamedExportType()) {
											queue.enqueue(module);
										}
									} else {
										let currentExportsInfo = exportsInfo;
										let currentModule = module;
										for (let i = 0; i < usedExport.length; i++) {
											const exportName = usedExport[i];
											const exportInfo = currentExportsInfo.getExportInfo(
												exportName
											);
											const lastOne = i === usedExport.length - 1;
											const nestedInfo = exportInfo.exportsInfo;
											if (!nestedInfo || lastOne) {
												if (exportInfo.used !== UsageState.Used) {
													exportInfo.used = UsageState.Used;
													if (currentModule) {
														queue.enqueue(currentModule);
													}
												}
												break;
											} else {
												if (exportInfo.used === UsageState.Unused) {
													exportInfo.used = UsageState.OnlyPropertiesUsed;
													if (currentModule) {
														queue.enqueue(currentModule);
													}
												}
												currentExportsInfo = nestedInfo;
												currentModule = exportInfoToModuleMap.get(nestedInfo);
											}
										}
									}
								}
							}
						} else {
							// for a module without side effects we stop tracking usage here when no export is used
							// This module won't be evaluated in this case
							if (module.factoryMeta.sideEffectFree) return;
							if (exportsInfo.setUsedForSideEffectsOnly()) {
								queue.enqueue(module);
							}
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

						processModule(
							referenceModule,
							importedNames === false
								? NOTHING_USED
								: importedNames === true
								? NS_OBJ_USED
								: importedNames.map(n => (Array.isArray(n) ? n : [n]))
						);
					};

					for (const module of modules) {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						exportInfoToModuleMap.set(exportsInfo, module);
						exportsInfo.setHasUseInfo();
					}

					/** @type {Queue<DependenciesBlock>} */
					const queue = new Queue();

					for (const deps of compilation.entryDependencies.values()) {
						for (const dep of deps) {
							const module = moduleGraph.getModule(dep);
							if (module) {
								processModule(module, NS_OBJ_USED);
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
