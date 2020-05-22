/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const mm = require("micromatch");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");

/** @typedef {import("../Module")} Module */
/** @typedef {import("../Dependency")} Dependency */

/**
 * @typedef {Object} ExportInModule
 * @property {Module} module the module
 * @property {string} exportName the name of the export
 * @property {boolean} checked if the export is conditional
 */

/**
 * @typedef {Object} ReexportInfo
 * @property {Map<string, ExportInModule[]>} static
 * @property {Map<Module, Set<string>>} dynamic
 */

/**
 * @param {ReexportInfo} info info object
 * @param {string} exportName name of export
 * @returns {ExportInModule | undefined} static export
 */
const getMappingFromInfo = (info, exportName) => {
	const staticMappings = info.static.get(exportName);
	if (staticMappings !== undefined) {
		if (staticMappings.length === 1) return staticMappings[0];
		return undefined;
	}
	const dynamicMappings = Array.from(info.dynamic).filter(
		([_, ignored]) => !ignored.has(exportName)
	);
	if (dynamicMappings.length === 1) {
		return {
			module: dynamicMappings[0][0],
			exportName,
			checked: true
		};
	}
	return undefined;
};

/**
 * @param {ReexportInfo} info info object
 * @param {string} exportName name of export of source module
 * @param {Module} module the target module
 * @param {string} innerExportName name of export of target module
 * @param {boolean} checked true, if existence of target module is checked
 */
const addStaticReexport = (
	info,
	exportName,
	module,
	innerExportName,
	checked
) => {
	let mappings = info.static.get(exportName);
	if (mappings !== undefined) {
		for (const mapping of mappings) {
			if (mapping.module === module && mapping.exportName === innerExportName) {
				mapping.checked = mapping.checked && checked;
				return;
			}
		}
	} else {
		mappings = [];
		info.static.set(exportName, mappings);
	}
	mappings.push({
		module,
		exportName: innerExportName,
		checked
	});
};

/**
 * @param {ReexportInfo} info info object
 * @param {Module} module the reexport module
 * @param {Set<string>} ignored ignore list
 * @returns {void}
 */
const addDynamicReexport = (info, module, ignored) => {
	const existingList = info.dynamic.get(module);
	if (existingList !== undefined) {
		for (const key of existingList) {
			if (!ignored.has(key)) existingList.delete(key);
		}
	} else {
		info.dynamic.set(module, new Set(ignored));
	}
};

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
				if (data.settings.sideEffects === false) {
					module.factoryMeta.sideEffectFree = true;
				} else if (data.settings.sideEffects === true) {
					module.factoryMeta.sideEffectFree = false;
				}
			});
		});
		compiler.hooks.compilation.tap("SideEffectsFlagPlugin", compilation => {
			compilation.hooks.optimizeDependencies.tap(
				"SideEffectsFlagPlugin",
				modules => {
					/** @type {Map<Module, ReexportInfo>} */
					const reexportMaps = new Map();

					// Capture reexports of sideEffectFree modules
					for (const module of modules) {
						/** @type {Dependency[]} */
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
									if (
										mode.type === "safe-reexport" ||
										mode.type === "checked-reexport" ||
										mode.type === "dynamic-reexport" ||
										mode.type === "reexport-non-harmony-default" ||
										mode.type === "reexport-non-harmony-default-strict" ||
										mode.type === "reexport-named-default"
									) {
										let info = reexportMaps.get(module);
										if (!info) {
											reexportMaps.set(
												module,
												(info = {
													static: new Map(),
													dynamic: new Map()
												})
											);
										}
										const targetModule = dep._module;
										switch (mode.type) {
											case "safe-reexport":
												for (const [key, id] of mode.map) {
													if (id) {
														addStaticReexport(
															info,
															key,
															targetModule,
															id,
															false
														);
													}
												}
												break;
											case "checked-reexport":
												for (const [key, id] of mode.map) {
													if (id) {
														addStaticReexport(
															info,
															key,
															targetModule,
															id,
															true
														);
													}
												}
												break;
											case "dynamic-reexport":
												addDynamicReexport(info, targetModule, mode.ignored);
												break;
											case "reexport-non-harmony-default":
											case "reexport-non-harmony-default-strict":
											case "reexport-named-default":
												addStaticReexport(
													info,
													mode.name,
													targetModule,
													"default",
													false
												);
												break;
										}
									}
								}
							}
						}
					}

					// Flatten reexports
					for (const info of reexportMaps.values()) {
						const dynamicReexports = info.dynamic;
						info.dynamic = new Map();
						for (const reexport of dynamicReexports) {
							let [targetModule, ignored] = reexport;
							for (;;) {
								const innerInfo = reexportMaps.get(targetModule);
								if (!innerInfo) break;

								for (const [key, reexports] of innerInfo.static) {
									if (ignored.has(key)) continue;
									for (const { module, exportName, checked } of reexports) {
										addStaticReexport(info, key, module, exportName, checked);
									}
								}

								// Follow dynamic reexport if there is only one
								if (innerInfo.dynamic.size !== 1) {
									// When there are more then one, we don't know which one
									break;
								}

								ignored = new Set(ignored);
								for (const [innerModule, innerIgnored] of innerInfo.dynamic) {
									for (const key of innerIgnored) {
										if (ignored.has(key)) continue;
										// This reexports ends here
										addStaticReexport(info, key, targetModule, key, true);
										ignored.add(key);
									}
									targetModule = innerModule;
								}
							}

							// Update reexport as all other cases has been handled
							addDynamicReexport(info, targetModule, ignored);
						}
					}

					for (const info of reexportMaps.values()) {
						const staticReexports = info.static;
						info.static = new Map();
						for (const [key, reexports] of staticReexports) {
							for (let mapping of reexports) {
								for (;;) {
									const innerInfo = reexportMaps.get(mapping.module);
									if (!innerInfo) break;

									const newMapping = getMappingFromInfo(
										innerInfo,
										mapping.exportName
									);
									if (!newMapping) break;
									mapping = newMapping;
								}
								addStaticReexport(
									info,
									key,
									mapping.module,
									mapping.exportName,
									mapping.checked
								);
							}
						}
					}

					// Update imports along the reexports from sideEffectFree modules
					for (const pair of reexportMaps) {
						const module = pair[0];
						const info = pair[1];
						let newReasons = undefined;
						for (let i = 0; i < module.reasons.length; i++) {
							const reason = module.reasons[i];
							const dep = reason.dependency;
							if (
								(dep instanceof HarmonyExportImportedSpecifierDependency ||
									(dep instanceof HarmonyImportSpecifierDependency &&
										!dep.namespaceObjectAsContext)) &&
								dep._id
							) {
								const mapping = getMappingFromInfo(info, dep._id);
								if (mapping) {
									dep.redirectedModule = mapping.module;
									dep.redirectedId = mapping.exportName;
									mapping.module.addReason(
										reason.module,
										dep,
										reason.explanation
											? reason.explanation +
													" (skipped side-effect-free modules)"
											: "(skipped side-effect-free modules)"
									);
									// removing the currect reason, by not adding it to the newReasons array
									// lazily create the newReasons array
									if (newReasons === undefined) {
										newReasons = i === 0 ? [] : module.reasons.slice(0, i);
									}
									continue;
								}
							}
							if (newReasons !== undefined) newReasons.push(reason);
						}
						if (newReasons !== undefined) {
							module.reasons = newReasons;
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
