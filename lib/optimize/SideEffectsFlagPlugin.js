/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const mm = require("micromatch");
const { STAGE_DEFAULT } = require("../OptimizationStages");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Module")} Module */

/**
 * @typedef {Object} ExportInModule
 * @property {Module} module the module
 * @property {string} exportName the name of the export
 */

class SideEffectsFlagPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.normalModuleFactory.tap("SideEffectsFlagPlugin", nmf => {
			nmf.hooks.module.tap("SideEffectsFlagPlugin", (module, data) => {
				const resolveData = data.resourceResolveData;
				if (
					resolveData &&
					resolveData.descriptionFileData &&
					resolveData.relativePath
				) {
					const sideEffects = resolveData.descriptionFileData.sideEffects;
					const hasSideEffects = SideEffectsFlagPlugin.moduleHasSideEffects(
						resolveData.relativePath,
						sideEffects
					);
					if (!hasSideEffects) {
						module.factoryMeta.sideEffectFree = true;
					}
				}

				return module;
			});
			nmf.hooks.module.tap("SideEffectsFlagPlugin", (module, data) => {
				if (data.settings.sideEffects === false) {
					module.factoryMeta.sideEffectFree = true;
				} else if (data.settings.sideEffects === true) {
					module.factoryMeta.sideEffectFree = false;
				}
			});
		});
		compiler.hooks.compilation.tap("SideEffectsFlagPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(
				/** @type {TODO} */ ({
					name: "SideEffectsFlagPlugin",
					stage: STAGE_DEFAULT
				}),
				modules => {
					/** @type {Map<Module, Map<string, ExportInModule>>} */
					const reexportMaps = new Map();

					// Capture reexports of sideEffectFree modules
					for (const module of modules) {
						for (const dep of module.dependencies) {
							if (dep instanceof HarmonyExportImportedSpecifierDependency) {
								if (module.factoryMeta.sideEffectFree) {
									const mode = dep.getMode(moduleGraph, true);
									if (mode.type === "safe-reexport") {
										let map = reexportMaps.get(module);
										if (!map) {
											reexportMaps.set(module, (map = new Map()));
										}
										for (const pair of mode.map) {
											map.set(pair[0], {
												module: mode.getModule(),
												exportName: pair[1]
											});
										}
									}
								}
							}
						}
					}

					// Flatten reexports
					for (const map of reexportMaps.values()) {
						for (const pair of map) {
							let mapping = pair[1];
							while (mapping) {
								const innerMap = reexportMaps.get(mapping.module);
								if (!innerMap) break;
								const newMapping = innerMap.get(mapping.exportName);
								if (newMapping) {
									map.set(pair[0], newMapping);
								}
								mapping = newMapping;
							}
						}
					}

					// Update imports along the reexports from sideEffectFree modules
					for (const pair of reexportMaps) {
						const module = pair[0];
						const map = pair[1];
						for (const connection of moduleGraph.getIncomingConnections(
							module
						)) {
							const dep = connection.dependency;
							if (
								dep instanceof HarmonyImportSpecifierDependency &&
								!dep.namespaceObjectAsContext
							) {
								const mapping = map.get(dep.id);
								if (mapping) {
									moduleGraph.updateModule(dep, mapping.module);
									moduleGraph.addExplanation(
										dep,
										"(skipped side-effect-free modules)"
									);
									moduleGraph.getMeta(dep).id = mapping.exportName;
									continue;
								}
							}
						}
					}
				}
			);
		});
	}

	static moduleHasSideEffects(moduleName, flagValue) {
		switch (typeof flagValue) {
			case "undefined":
				return true;
			case "boolean":
				return flagValue;
			case "string":
				if (process.platform === "win32") {
					flagValue = flagValue.replace(/\\/g, "/");
				}
				return mm.isMatch(moduleName, flagValue, {
					matchBase: true
				});
			case "object":
				return flagValue.some(glob =>
					SideEffectsFlagPlugin.moduleHasSideEffects(moduleName, glob)
				);
		}
	}
}
module.exports = SideEffectsFlagPlugin;
