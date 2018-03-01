/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const mm = require("micromatch");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");

class SideEffectsFlagPlugin {
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
				if (data.settings.sideEffects === false)
					module.factoryMeta.sideEffectFree = true;
				else if (data.settings.sideEffects === true)
					module.factoryMeta.sideEffectFree = false;
			});
		});
		compiler.hooks.compilation.tap("SideEffectsFlagPlugin", compilation => {
			compilation.hooks.optimizeDependencies.tap(
				"SideEffectsFlagPlugin",
				modules => {
					const reexportMaps = new Map();

					// Capture reexports of sideEffectFree modules
					for (const module of modules) {
						const removeDependencies = [];
						for (const dep of module.dependencies) {
							if (dep instanceof HarmonyImportSideEffectDependency) {
								if (dep.module && dep.module.factoryMeta.sideEffectFree) {
									removeDependencies.push(dep);
								}
							} else if (
								dep instanceof HarmonyExportImportedSpecifierDependency
							) {
								if (module.factoryMeta.sideEffectFree) {
									const mode = dep.getMode(true);
									if (mode.type === "safe-reexport") {
										let map = reexportMaps.get(module);
										if (!map) {
											reexportMaps.set(module, (map = new Map()));
										}
										for (const pair of mode.map) {
											map.set(pair[0], {
												module: mode.module,
												exportName: pair[1]
											});
										}
									}
								}
							}
						}
						for (const dep of removeDependencies) {
							module.removeDependency(dep);
							dep.module.reasons = dep.module.reasons.filter(
								r => r.dependency !== dep
							);
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
					const updates = [];
					for (const pair of reexportMaps) {
						const module = pair[0];
						const map = pair[1];
						for (const reason of module.reasons) {
							const dep = reason.dependency;
							if (dep instanceof HarmonyImportSpecifierDependency) {
								const mapping = map.get(dep.id);
								if (mapping) {
									updates.push({
										dep,
										mapping,
										module,
										reason
									});
								}
							}
						}
					}

					// Execute updates
					for (const update of updates) {
						const dep = update.dep;
						const mapping = update.mapping;
						const module = update.module;
						const reason = update.reason;
						dep.module = mapping.module;
						dep.id = mapping.exportName;
						module.removeReason(reason.module, dep);
						mapping.module.addReason(reason.module, dep);
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
