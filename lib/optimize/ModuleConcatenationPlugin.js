/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const ChunkGraph = require("../ChunkGraph");
const ModuleGraph = require("../ModuleGraph");
const ModuleRestoreError = require("../ModuleRestoreError");
const ModuleStoreError = require("../ModuleStoreError");
const { STAGE_DEFAULT } = require("../OptimizationStages");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const ModuleHotAcceptDependency = require("../dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("../dependencies/ModuleHotDeclineDependency");
const StackedMap = require("../util/StackedMap");
const ConcatenatedModule = require("./ConcatenatedModule");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const formatBailoutReason = msg => {
	return "ModuleConcatenation bailout: " + msg;
};

class ModuleConcatenationPlugin {
	constructor(options) {
		if (typeof options !== "object") options = {};
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ModuleConcatenationPlugin",
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;
				const bailoutReasonMap = new Map();

				const setBailoutReason = (module, reason) => {
					setInnerBailoutReason(module, reason);
					moduleGraph
						.getOptimizationBailout(module)
						.push(
							typeof reason === "function"
								? rs => formatBailoutReason(reason(rs))
								: formatBailoutReason(reason)
						);
				};

				const setInnerBailoutReason = (module, reason) => {
					bailoutReasonMap.set(module, reason);
				};

				const getInnerBailoutReason = (module, requestShortener) => {
					const reason = bailoutReasonMap.get(module);
					if (typeof reason === "function") return reason(requestShortener);
					return reason;
				};

				const formatBailoutWarning = (module, problem) => requestShortener => {
					const reason = getInnerBailoutReason(module, requestShortener);
					const reasonWithPrefix = reason ? ` (<- ${reason})` : "";
					if (module === problem) {
						return formatBailoutReason(
							`Cannot concat with ${module.readableIdentifier(
								requestShortener
							)}${reasonWithPrefix}`
						);
					} else {
						return formatBailoutReason(
							`Cannot concat with ${module.readableIdentifier(
								requestShortener
							)} because of ${problem.readableIdentifier(
								requestShortener
							)}${reasonWithPrefix}`
						);
					}
				};

				compilation.hooks.optimizeChunkModules.tapAsync(
					{
						name: "ModuleConcatenationPlugin",
						stage: STAGE_DEFAULT
					},
					(allChunks, modules, callback) => {
						const logger = compilation.getLogger("ModuleConcatenationPlugin");
						const chunkGraph = compilation.chunkGraph;
						const relevantModules = [];
						const possibleInners = new Set();
						logger.time("select relevant modules");
						for (const module of modules) {
							// Only harmony modules are valid for optimization
							if (
								!module.buildMeta ||
								module.buildMeta.exportsType !== "namespace" ||
								module.presentationalDependencies === undefined ||
								!module.presentationalDependencies.some(
									d => d instanceof HarmonyCompatibilityDependency
								)
							) {
								setBailoutReason(module, "Module is not an ECMAScript module");
								continue;
							}

							// Some expressions are not compatible with module concatenation
							// because they may produce unexpected results. The plugin bails out
							// if some were detected upfront.
							if (
								module.buildInfo &&
								module.buildInfo.moduleConcatenationBailout
							) {
								setBailoutReason(
									module,
									`Module uses ${module.buildInfo.moduleConcatenationBailout}`
								);
								continue;
							}

							// Must not be an async module
							if (moduleGraph.isAsync(module)) {
								setBailoutReason(module, `Module is async`);
								continue;
							}

							// Exports must be known (and not dynamic)
							if (!Array.isArray(moduleGraph.getProvidedExports(module))) {
								setBailoutReason(module, "Module exports are unknown");
								continue;
							}

							// Hot Module Replacement need it's own module to work correctly
							if (
								module.dependencies.some(
									dep =>
										dep instanceof ModuleHotAcceptDependency ||
										dep instanceof ModuleHotDeclineDependency
								)
							) {
								setBailoutReason(module, "Module uses Hot Module Replacement");
								continue;
							}

							// Module must be in any chunk (we don't want to do useless work)
							if (chunkGraph.getNumberOfModuleChunks(module) === 0) {
								setBailoutReason(module, "Module is not in any chunk");
								continue;
							}

							relevantModules.push(module);

							// Module must not be the entry points
							if (chunkGraph.isEntryModule(module)) {
								setInnerBailoutReason(module, "Module is an entry point");
								continue;
							}

							const incomingConnections = Array.from(
								moduleGraph.getIncomingConnections(module)
							).filter(connection => connection.active);

							// Module must only be used by Harmony Imports
							const nonHarmonyConnections = incomingConnections.filter(
								connection =>
									!connection.dependency ||
									!(connection.dependency instanceof HarmonyImportDependency)
							);
							if (nonHarmonyConnections.length > 0) {
								setInnerBailoutReason(module, requestShortener => {
									const importingModules = new Set(
										nonHarmonyConnections
											.map(c => c.originModule)
											.filter(Boolean)
									);
									const importingExplanations = new Set(
										nonHarmonyConnections
											.map(c => c.explanation)
											.filter(Boolean)
									);
									const importingModuleTypes = new Map(
										Array.from(importingModules).map(
											m =>
												/** @type {[Module, Set<string>]} */ ([
													m,
													new Set(
														nonHarmonyConnections
															.filter(c => c.originModule === m)
															.map(c => c.dependency.type)
															.sort()
													)
												])
										)
									);
									const names = Array.from(importingModules)
										.map(
											m =>
												`${m.readableIdentifier(
													requestShortener
												)} (referenced with ${Array.from(
													importingModuleTypes.get(m)
												).join(", ")})`
										)
										.sort();
									const explanations = Array.from(importingExplanations).sort();
									if (names.length > 0 && explanations.length === 0) {
										return `Module is referenced from these modules with unsupported syntax: ${names.join(
											", "
										)}`;
									} else if (names.length === 0 && explanations.length > 0) {
										return `Module is referenced by: ${explanations.join(
											", "
										)}`;
									} else if (names.length > 0 && explanations.length > 0) {
										return `Module is referenced from these modules with unsupported syntax: ${names.join(
											", "
										)} and by: ${explanations.join(", ")}`;
									} else {
										return "Module is referenced in a unsupported way";
									}
								});
								continue;
							}

							// Module must be in the same chunks like the referencing module
							const otherChunkConnections = incomingConnections.filter(
								connection => {
									return (
										connection.originModule &&
										!chunkGraph.haveModulesEqualChunks(
											connection.originModule,
											module
										)
									);
								}
							);
							if (otherChunkConnections.length > 0) {
								setInnerBailoutReason(module, requestShortener => {
									const importingModules = new Set(
										otherChunkConnections
											.map(c => c.originModule)
											.filter(Boolean)
									);
									const names = Array.from(importingModules)
										.map(m => m.readableIdentifier(requestShortener))
										.sort();
									return `Module is referenced from different chunks by these modules: ${names.join(
										", "
									)}`;
								});
								continue;
							}

							possibleInners.add(module);
						}
						logger.timeEnd("select relevant modules");
						logger.debug(
							`${relevantModules.length} potential root modules, ${possibleInners.size} potential inner modules`
						);
						// sort by depth
						// modules with lower depth are more likely suited as roots
						// this improves performance, because modules already selected as inner are skipped
						logger.time("sort relevant modules");
						relevantModules.sort((a, b) => {
							return moduleGraph.getDepth(a) - moduleGraph.getDepth(b);
						});
						logger.timeEnd("sort relevant modules");

						logger.time("find modules to concatenate");
						const concatConfigurations = [];
						const usedAsInner = new Set();
						for (const currentRoot of relevantModules) {
							// when used by another configuration as inner:
							// the other configuration is better and we can skip this one
							if (usedAsInner.has(currentRoot)) continue;

							// create a configuration with the root
							const currentConfiguration = new ConcatConfiguration(currentRoot);

							// cache failures to add modules
							const failureCache = new Map();

							// potential optional import candidates
							/** @type {Set<Module>} */
							const candidates = new Set();

							// try to add all imports
							for (const imp of this._getImports(compilation, currentRoot)) {
								candidates.add(imp);
							}

							for (const imp of candidates) {
								// _tryToAdd modifies the config even if it fails
								// so make sure to only accept changes when it succeed
								const backup = currentConfiguration.snapshot();
								const impCandidates = new Set();
								const problem = this._tryToAdd(
									compilation,
									currentConfiguration,
									imp,
									possibleInners,
									impCandidates,
									failureCache
								);
								if (problem) {
									failureCache.set(imp, problem);
									currentConfiguration.addWarning(imp, problem);

									// roll back
									currentConfiguration.rollback(backup);
								} else {
									for (const c of impCandidates) {
										candidates.add(c);
									}
								}
							}
							if (!currentConfiguration.isEmpty()) {
								concatConfigurations.push(currentConfiguration);
								for (const module of currentConfiguration.getModules()) {
									if (module !== currentConfiguration.rootModule) {
										usedAsInner.add(module);
									}
								}
							} else {
								const optimizationBailouts = moduleGraph.getOptimizationBailout(
									currentRoot
								);
								for (const warning of currentConfiguration.getWarningsSorted()) {
									optimizationBailouts.push(
										formatBailoutWarning(warning[0], warning[1])
									);
								}
							}
						}
						logger.timeEnd("find modules to concatenate");
						logger.debug(
							`${concatConfigurations.length} concat configurations`
						);
						// HACK: Sort configurations by length and start with the longest one
						// to get the biggest groups possible. Used modules are marked with usedModules
						// TODO: Allow to reuse existing configuration while trying to add dependencies.
						// This would improve performance. O(n^2) -> O(n)
						logger.time(`sort concat configurations`);
						concatConfigurations.sort((a, b) => {
							return b.modules.size - a.modules.size;
						});
						logger.timeEnd(`sort concat configurations`);
						const usedModules = new Set();

						logger.time("create concatenated modules");
						asyncLib.each(
							concatConfigurations,
							(concatConfiguration, callback) => {
								const rootModule = concatConfiguration.rootModule;

								// Avoid overlapping configurations
								// TODO: remove this when todo above is fixed
								if (usedModules.has(rootModule)) return callback();
								const modules = concatConfiguration.getModules();
								for (const m of modules) {
									usedModules.add(m);
								}

								// Create a new ConcatenatedModule
								let newModule = ConcatenatedModule.createFromModuleGraph(
									rootModule,
									modules,
									moduleGraph,
									compiler.root
								);

								// get name for caching
								const identifier = newModule.identifier();
								const cacheName = `${compilation.compilerPath}/ModuleConcatenationPlugin/${identifier}`;

								const restore = () => {
									compilation.cache.get(cacheName, null, (err, cacheModule) => {
										if (err) {
											return callback(new ModuleRestoreError(newModule, err));
										}

										if (cacheModule) {
											cacheModule.updateCacheModule(newModule);
											newModule = cacheModule;
										}

										build();
									});
								};

								const build = () => {
									newModule.build(
										compiler.options,
										compilation,
										null,
										null,
										err => {
											if (err) {
												if (!err.module) {
													err.module = newModule;
												}
												return callback(err);
											}
											integrateAndStore();
										}
									);
								};

								const integrateAndStore = () => {
									ChunkGraph.setChunkGraphForModule(newModule, chunkGraph);
									ModuleGraph.setModuleGraphForModule(newModule, moduleGraph);
									for (const warning of concatConfiguration.getWarningsSorted()) {
										moduleGraph
											.getOptimizationBailout(newModule)
											.push(formatBailoutWarning(warning[0], warning[1]));
									}
									moduleGraph.cloneModuleAttributes(rootModule, newModule);
									for (const m of modules) {
										compilation.modules.delete(m);

										// add to builtModules when one of the included modules was built
										if (compilation.builtModules.has(m)) {
											compilation.builtModules.add(newModule);
										}
										// remove module from chunk
										chunkGraph.replaceModule(m, newModule);
										// replace module references with the concatenated module
										moduleGraph.moveModuleConnections(m, newModule, c => {
											return !(
												c.dependency instanceof HarmonyImportDependency &&
												modules.has(c.originModule) &&
												modules.has(c.module)
											);
										});
									}
									// add concatenated module to the compilation
									compilation.modules.add(newModule);

									// TODO check if module needs build to avoid caching it without change
									compilation.cache.store(cacheName, null, newModule, err => {
										if (err) {
											return callback(new ModuleStoreError(newModule, err));
										}

										callback();
									});
								};

								restore();
							},
							err => {
								logger.timeEnd("create concatenated modules");
								process.nextTick(() => callback(err));
							}
						);
					}
				);
			}
		);
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the module to be added
	 * @returns {Set<Module>} the imported modules
	 */
	_getImports(compilation, module) {
		const moduleGraph = compilation.moduleGraph;
		const set = new Set();
		for (const dep of module.dependencies) {
			// Get reference info only for harmony Dependencies
			if (!(dep instanceof HarmonyImportDependency)) continue;

			const connection = moduleGraph.getConnection(dep);
			// Reference is valid and has a module
			if (!connection || !connection.module || !connection.active) continue;

			const importedNames = compilation.getDependencyReferencedExports(dep);

			if (
				importedNames.every(i => i.length > 0) ||
				Array.isArray(moduleGraph.getProvidedExports(module))
			) {
				set.add(connection.module);
			}
		}
		return set;
	}

	/**
	 * @param {Compilation} compilation webpack compilation
	 * @param {ConcatConfiguration} config concat configuration (will be modified when added)
	 * @param {Module} module the module to be added
	 * @param {Set<Module>} possibleModules modules that are candidates
	 * @param {Set<Module>} candidates list of potential candidates (will be added to)
	 * @param {Map<Module, Module>} failureCache cache for problematic modules to be more performant
	 * @returns {Module} the problematic module
	 */
	_tryToAdd(
		compilation,
		config,
		module,
		possibleModules,
		candidates,
		failureCache
	) {
		const cacheEntry = failureCache.get(module);
		if (cacheEntry) {
			return cacheEntry;
		}

		// Already added?
		if (config.has(module)) {
			return null;
		}

		// Not possible to add?
		if (!possibleModules.has(module)) {
			failureCache.set(module, module); // cache failures for performance
			return module;
		}

		// Add the module
		config.add(module);

		const moduleGraph = compilation.moduleGraph;

		// Every module which depends on the added module must be in the configuration too.
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			// Modules that are not used can be ignored
			if (!connection.active) continue;

			const problem = this._tryToAdd(
				compilation,
				config,
				connection.originModule,
				possibleModules,
				candidates,
				failureCache
			);
			if (problem) {
				failureCache.set(module, problem); // cache failures for performance
				return problem;
			}
		}

		// Add imports to possible candidates list
		for (const imp of this._getImports(compilation, module)) {
			candidates.add(imp);
		}
		return null;
	}
}

class ConcatConfiguration {
	/**
	 *
	 * @param {Module} rootModule the root module
	 */
	constructor(rootModule) {
		this.rootModule = rootModule;
		/** @type {StackedMap<Module, true>} */
		this.modules = new StackedMap();
		this.modules.set(rootModule, true);
		/** @type {StackedMap<Module, Module>} */
		this.warnings = new StackedMap();
	}

	add(module) {
		this.modules.set(module, true);
	}

	has(module) {
		return this.modules.has(module);
	}

	isEmpty() {
		return this.modules.size === 1;
	}

	addWarning(module, problem) {
		this.warnings.set(module, problem);
	}

	getWarningsSorted() {
		return new Map(
			this.warnings.asPairArray().sort((a, b) => {
				const ai = a[0].identifier();
				const bi = b[0].identifier();
				if (ai < bi) return -1;
				if (ai > bi) return 1;
				return 0;
			})
		);
	}

	/**
	 * @returns {Set<Module>} modules as set
	 */
	getModules() {
		return this.modules.asSet();
	}

	snapshot() {
		const base = this.modules;
		this.modules = this.modules.createChild();
		return base;
	}

	rollback(snapshot) {
		this.modules = snapshot;
	}
}

module.exports = ModuleConcatenationPlugin;
