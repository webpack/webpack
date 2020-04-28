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

					/** @type {Map<Module, Map<string, ExportInModule>>} */
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
									const mode = dep.getMode(moduleGraph, true);
									if (mode.type === "normal-reexport") {
										let map = reexportMaps.get(module);
										if (!map) {
											reexportMaps.set(module, (map = new Map()));
										}
										for (const [key, ids] of mode.map) {
											// TODO Support reexporting namespace object
											if (ids.length > 0 && !mode.checked.has(key)) {
												map.set(key, {
													module: moduleGraph.getModule(dep),
													exportName: ids[0]
												});
											}
										}
									}
								}
							}
						}
					}
					logger.timeEnd("capture reexports from modules");

					// Flatten reexports
					logger.time("flatten reexports");
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
					logger.timeEnd("flatten reexports");

					// Update imports along the reexports from sideEffectFree modules
					logger.time("update imports");
					for (const [module, map] of reexportMaps) {
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
									const mapping = map.get(ids[0]);
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
