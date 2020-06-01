/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { NO_EXPORTS_REFERENCED } = require("./Dependency");
const { UsageState } = require("./ModuleGraph");
const { STAGE_DEFAULT } = require("./OptimizationStages");
const Queue = require("./util/Queue");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph").ExportsInfo} ExportsInfo */

class FlagDependencyUsagePlugin {
	/**
	 * Apply the plugin
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
					const logger = compilation.getLogger(
						"webpack.FlagDependencyUsagePlugin"
					);

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
							for (let usedExport of usedExports) {
								if (usedExport.length === 0) {
									if (exportsInfo.setUsedInUnknownWay()) {
										queue.enqueue(module);
									}
								} else {
									let currentExportsInfo = exportsInfo;
									for (let i = 0; i < usedExport.length; i++) {
										const exportName = usedExport[i];
										const exportInfo = currentExportsInfo.getExportInfo(
											exportName
										);
										const lastOne = i === usedExport.length - 1;
										if (!lastOne) {
											const nestedInfo = exportInfo.getNestedExportsInfo();
											if (nestedInfo) {
												if (exportInfo.used === UsageState.Unused) {
													exportInfo.used = UsageState.OnlyPropertiesUsed;
													const currentModule =
														currentExportsInfo === exportsInfo
															? module
															: exportInfoToModuleMap.get(currentExportsInfo);
													if (currentModule) {
														queue.enqueue(currentModule);
													}
												}
												currentExportsInfo = nestedInfo;
												continue;
											}
										}
										if (exportInfo.used !== UsageState.Used) {
											exportInfo.used = UsageState.Used;
											const currentModule =
												currentExportsInfo === exportsInfo
													? module
													: exportInfoToModuleMap.get(currentExportsInfo);
											if (currentModule) {
												queue.enqueue(currentModule);
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
								module.factoryMeta !== undefined &&
								module.factoryMeta.sideEffectFree
							)
								return;
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
						const connection = moduleGraph.getConnection(dep);
						if (!connection || !connection.module || !connection.active) {
							return;
						}
						const referencedExports = compilation.getDependencyReferencedExports(
							dep
						);

						processModule(connection.module, referencedExports);
					};

					logger.time("initialize exports usage");
					for (const module of modules) {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						exportInfoToModuleMap.set(exportsInfo, module);
						exportsInfo.setHasUseInfo();
					}
					logger.timeEnd("initialize exports usage");

					logger.time("trace exports usage in graph");
					/** @type {Queue<DependenciesBlock>} */
					const queue = new Queue();

					const processEntryDependency = dep => {
						const module = moduleGraph.getModule(dep);
						if (module) {
							processModule(module, NO_EXPORTS_REFERENCED);
							queue.enqueue(module);
						}
					};
					for (const dep of compilation.globalEntry.dependencies) {
						processEntryDependency(dep);
					}
					for (const dep of compilation.globalEntry.includeDependencies) {
						processEntryDependency(dep);
					}
					for (const {
						dependencies: deps,
						includeDependencies: includeDeps
					} of compilation.entries.values()) {
						for (const dep of deps) {
							processEntryDependency(dep);
						}
						for (const dep of includeDeps) {
							processEntryDependency(dep);
						}
					}

					while (queue.length) {
						const depBlock = queue.dequeue();
						processDependenciesBlock(depBlock);
					}
					logger.timeEnd("trace exports usage in graph");
				}
			);
		});
	}
}

module.exports = FlagDependencyUsagePlugin;
