/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const glob2regexp = require("glob-to-regexp");
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
 * @property {boolean} checked if the export is conditional
 */

/**
 * @typedef {Object} ReexportInfo
 * @property {Map<string, ExportInModule[]>} static
 * @property {Map<Module, Set<string>>} dynamic
 */

/** @type {WeakMap<any, Map<string, RegExp>>} */
const globToRegexpCache = new WeakMap();

/**
 * @param {string} glob the pattern
 * @param {Map<string, RegExp>} cache the glob to RegExp cache
 * @returns {RegExp} a regular expression
 */
const globToRegexp = (glob, cache) => {
	const cacheEntry = cache.get(glob);
	if (cacheEntry !== undefined) return cacheEntry;
	if (!glob.includes("/")) {
		glob = `**/${glob}`;
	}
	const baseRegexp = glob2regexp(glob, { globstar: true, extended: true });
	const regexpSource = baseRegexp.source;
	const regexp = new RegExp("^(\\./)?" + regexpSource.slice(1));
	cache.set(glob, regexp);
	return regexp;
};

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
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		let cache = globToRegexpCache.get(compiler.root);
		if (cache === undefined) {
			cache = new Map();
			globToRegexpCache.set(compiler.root, cache);
		}
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
						sideEffects,
						cache
					);
					if (!hasSideEffects) {
						if (module.factoryMeta === undefined) {
							module.factoryMeta = {};
						}
						module.factoryMeta.sideEffectFree = true;
					}
				}

				return module;
			});
			nmf.hooks.module.tap("SideEffectsFlagPlugin", (module, data) => {
				if (data.settings.sideEffects === false) {
					if (module.factoryMeta === undefined) {
						module.factoryMeta = {};
					}
					module.factoryMeta.sideEffectFree = true;
				} else if (data.settings.sideEffects === true) {
					if (module.factoryMeta !== undefined) {
						module.factoryMeta.sideEffectFree = false;
					}
				}
				return module;
			});
		});
		compiler.hooks.compilation.tap("SideEffectsFlagPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeDependencies.tap(
				{
					name: "SideEffectsFlagPlugin",
					stage: STAGE_DEFAULT
				},
				modules => {
					const logger = compilation.getLogger("webpack.SideEffectsFlagPlugin");

					/** @type {Map<Module, ReexportInfo>} */
					const reexportMaps = new Map();

					// Capture reexports of sideEffectFree modules
					logger.time("capture reexports from modules");
					for (const module of modules) {
						if (
							module.factoryMeta !== undefined &&
							module.factoryMeta.sideEffectFree
						) {
							for (const dep of module.dependencies) {
								if (dep instanceof HarmonyExportImportedSpecifierDependency) {
									const mode = dep.getMode(moduleGraph, undefined);
									if (
										mode.type === "normal-reexport" ||
										mode.type === "dynamic-reexport" ||
										mode.type === "reexport-dynamic-default" ||
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
										const targetModule = moduleGraph.getModule(dep);
										switch (mode.type) {
											case "normal-reexport":
												for (const { name, ids, checked } of mode.items) {
													// TODO Support reexporting namespace object
													if (ids.length > 0) {
														addStaticReexport(
															info,
															name,
															targetModule,
															ids[0],
															checked
														);
													}
												}
												break;
											case "dynamic-reexport":
												addDynamicReexport(info, targetModule, mode.ignored);
												break;
											case "reexport-dynamic-default":
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
					logger.timeEnd("capture reexports from modules");

					// Flatten reexports
					logger.time("flatten dynamic reexports");
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
					logger.timeEnd("flatten dynamic reexports");

					logger.time("flatten static reexports");
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
					logger.timeEnd("flatten static reexports");

					// Update imports along the reexports from sideEffectFree modules
					logger.time("update imports");
					for (const [module, info] of reexportMaps) {
						for (const connection of moduleGraph.getIncomingConnections(
							module
						)) {
							const dep = connection.dependency;
							if (
								dep instanceof HarmonyExportImportedSpecifierDependency ||
								(dep instanceof HarmonyImportSpecifierDependency &&
									!dep.namespaceObjectAsContext)
							) {
								// TODO improve for nested imports
								const ids = dep.getIds(moduleGraph);
								if (ids.length > 0) {
									const mapping = getMappingFromInfo(info, ids[0]);
									if (mapping) {
										moduleGraph.updateModule(dep, mapping.module);
										moduleGraph.addExplanation(
											dep,
											"(skipped side-effect-free modules)"
										);
										dep.setIds(
											moduleGraph,
											mapping.exportName
												? [mapping.exportName, ...ids.slice(1)]
												: ids.slice(1)
										);
										continue;
									}
								}
							}
						}
					}
					logger.timeEnd("update imports");
				}
			);
		});
	}

	static moduleHasSideEffects(moduleName, flagValue, cache) {
		switch (typeof flagValue) {
			case "undefined":
				return true;
			case "boolean":
				return flagValue;
			case "string":
				return globToRegexp(flagValue, cache).test(moduleName);
			case "object":
				return flagValue.some(glob =>
					SideEffectsFlagPlugin.moduleHasSideEffects(moduleName, glob, cache)
				);
		}
	}
}
module.exports = SideEffectsFlagPlugin;
