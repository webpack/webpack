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
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const StackedMap = require("../util/StackedMap");
const { compareModulesByIdentifier } = require("../util/comparators");
const {
	intersectRuntime,
	mergeRuntimeOwned,
	filterRuntime,
	runtimeToString,
	mergeRuntime
} = require("../util/runtime");
const ConcatenatedModule = require("./ConcatenatedModule");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

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
				const cache = compilation.getCache("ModuleConcatenationPlugin");

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
					if (typeof problem === "function") {
						return formatBailoutReason(
							`Cannot concat with ${module.readableIdentifier(
								requestShortener
							)}: ${problem(requestShortener)}`
						);
					}
					const reason = getInnerBailoutReason(module, requestShortener);
					const reasonWithPrefix = reason ? `: ${reason}` : "";
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
						const { chunkGraph, moduleGraph } = compilation;
						const relevantModules = [];
						const possibleInners = new Set();
						const context = {
							chunkGraph,
							moduleGraph
						};
						logger.time("select relevant modules");
						for (const module of modules) {
							let canBeRoot = true;
							let canBeInner = true;

							const bailoutReason = module.getConcatenationBailoutReason(
								context
							);
							if (bailoutReason) {
								setBailoutReason(module, bailoutReason);
								continue;
							}

							// Must not be an async module
							if (moduleGraph.isAsync(module)) {
								setBailoutReason(module, `Module is async`);
								continue;
							}

							// Must be in strict mode
							if (!module.buildInfo.strict) {
								setBailoutReason(module, `Module is not in strict mode`);
								continue;
							}

							// Module must be in any chunk (we don't want to do useless work)
							if (chunkGraph.getNumberOfModuleChunks(module) === 0) {
								setBailoutReason(module, "Module is not in any chunk");
								continue;
							}

							// Exports must be known (and not dynamic)
							const exportsInfo = moduleGraph.getExportsInfo(module);
							const relevantExports = exportsInfo.getRelevantExports(undefined);
							const unknownReexports = relevantExports.filter(exportInfo => {
								return (
									exportInfo.isReexport() && !exportInfo.getTarget(moduleGraph)
								);
							});
							if (unknownReexports.length > 0) {
								setBailoutReason(
									module,
									`Reexports in this module do not have a static target (${Array.from(
										unknownReexports,
										exportInfo =>
											`${
												exportInfo.name || "other exports"
											}: ${exportInfo.getUsedInfo()}`
									).join(", ")})`
								);
								continue;
							}

							// Root modules must have a static list of exports
							const unknownProvidedExports = relevantExports.filter(
								exportInfo => {
									return exportInfo.provided !== true;
								}
							);
							if (unknownProvidedExports.length > 0) {
								setBailoutReason(
									module,
									`List of module exports is dynamic (${Array.from(
										unknownProvidedExports,
										exportInfo =>
											`${
												exportInfo.name || "other exports"
											}: ${exportInfo.getProvidedInfo()} and ${exportInfo.getUsedInfo()}`
									).join(", ")})`
								);
								canBeRoot = false;
							}

							// Module must not be an entry point
							if (chunkGraph.isEntryModule(module)) {
								setInnerBailoutReason(module, "Module is an entry point");
								canBeInner = false;
							}

							if (canBeRoot) relevantModules.push(module);
							if (canBeInner) possibleInners.add(module);
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

							let chunkRuntime = undefined;
							for (const r of chunkGraph.getModuleRuntimes(currentRoot)) {
								chunkRuntime = mergeRuntimeOwned(chunkRuntime, r);
							}
							const exportsInfo = moduleGraph.getExportsInfo(currentRoot);
							const filteredRuntime = filterRuntime(chunkRuntime, r =>
								exportsInfo.isModuleUsed(r)
							);
							const activeRuntime =
								filteredRuntime === true
									? chunkRuntime
									: filteredRuntime === false
									? undefined
									: filteredRuntime;

							// create a configuration with the root
							const currentConfiguration = new ConcatConfiguration(
								currentRoot,
								activeRuntime
							);

							// cache failures to add modules
							const failureCache = new Map();

							// potential optional import candidates
							/** @type {Set<Module>} */
							const candidates = new Set();

							// try to add all imports
							for (const imp of this._getImports(
								compilation,
								currentRoot,
								activeRuntime
							)) {
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
									chunkRuntime,
									activeRuntime,
									possibleInners,
									impCandidates,
									failureCache,
									chunkGraph
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
								let newModule = ConcatenatedModule.create(
									rootModule,
									modules,
									concatConfiguration.runtime,
									compiler.root
								);

								const cacheItem = cache.getItemCache(
									newModule.identifier(),
									null
								);

								const restore = () => {
									cacheItem.get((err, cacheModule) => {
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
										// add to builtModules when one of the included modules was built
										if (compilation.builtModules.has(m)) {
											compilation.builtModules.add(newModule);
										}
										if (m !== rootModule) {
											// attach external references to the concatenated module too
											moduleGraph.copyOutgoingModuleConnections(
												m,
												newModule,
												c => {
													return (
														c.originModule === m &&
														!(
															c.dependency instanceof HarmonyImportDependency &&
															modules.has(c.module)
														)
													);
												}
											);
											// remove module from chunk
											for (const chunk of chunkGraph.getModuleChunksIterable(
												rootModule
											)) {
												chunkGraph.disconnectChunkAndModule(chunk, m);
											}
										}
									}
									compilation.modules.delete(rootModule);
									// remove module from chunk
									chunkGraph.replaceModule(rootModule, newModule);
									// replace module references with the concatenated module
									moduleGraph.moveModuleConnections(
										rootModule,
										newModule,
										c => {
											const otherModule =
												c.module === rootModule ? c.originModule : c.module;
											const innerConnection =
												c.dependency instanceof HarmonyImportDependency &&
												modules.has(otherModule);
											return !innerConnection;
										}
									);
									// add concatenated module to the compilation
									compilation.modules.add(newModule);

									// TODO check if module needs build to avoid caching it without change
									cacheItem.store(newModule, err => {
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
	 * @param {RuntimeSpec} runtime the runtime scope
	 * @returns {Set<Module>} the imported modules
	 */
	_getImports(compilation, module, runtime) {
		const moduleGraph = compilation.moduleGraph;
		const set = new Set();
		for (const dep of module.dependencies) {
			// Get reference info only for harmony Dependencies
			if (!(dep instanceof HarmonyImportDependency)) continue;

			const connection = moduleGraph.getConnection(dep);
			// Reference is valid and has a module
			if (
				!connection ||
				!connection.module ||
				!connection.isTargetActive(runtime)
			) {
				continue;
			}

			const importedNames = compilation.getDependencyReferencedExports(
				dep,
				undefined
			);

			if (
				importedNames.every(i =>
					Array.isArray(i) ? i.length > 0 : i.name.length > 0
				) ||
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
	 * @param {RuntimeSpec} runtime the runtime scope of the generated code
	 * @param {RuntimeSpec} activeRuntime the runtime scope of the root module
	 * @param {Set<Module>} possibleModules modules that are candidates
	 * @param {Set<Module>} candidates list of potential candidates (will be added to)
	 * @param {Map<Module, Module | function(RequestShortener): string>} failureCache cache for problematic modules to be more performant
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {Module | function(RequestShortener): string} the problematic module
	 */
	_tryToAdd(
		compilation,
		config,
		module,
		runtime,
		activeRuntime,
		possibleModules,
		candidates,
		failureCache,
		chunkGraph
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

		// Module must be in the correct chunks
		const missingChunks = Array.from(
			chunkGraph.getModuleChunksIterable(config.rootModule)
		)
			.filter(chunk => !chunkGraph.isModuleInChunk(module, chunk))
			.map(chunk => chunk.name || "unnamed chunk(s)");
		if (missingChunks.length > 0) {
			const missingChunksList = Array.from(new Set(missingChunks)).sort();
			const chunks = Array.from(
				new Set(
					Array.from(chunkGraph.getModuleChunksIterable(module)).map(
						chunk => chunk.name || "unnamed chunk(s)"
					)
				)
			).sort();
			const problem = requestShortener =>
				`Module ${module.readableIdentifier(
					requestShortener
				)} is not in the same chunk(s) (expected in chunk(s) ${missingChunksList.join(
					", "
				)}, module is in chunk(s) ${chunks.join(", ")})`;
			failureCache.set(module, problem); // cache failures for performance
			return problem;
		}

		// Add the module
		config.add(module);

		const moduleGraph = compilation.moduleGraph;

		const incomingConnections = Array.from(
			moduleGraph.getIncomingConnections(module)
		).filter(connection => {
			// We are not interested in inactive connections
			if (!connection.isActive(runtime)) return false;

			// Include, but do not analyse further, connections from non-modules
			if (!connection.originModule) return true;

			// Ignore connection from orphan modules
			if (chunkGraph.getNumberOfModuleChunks(connection.originModule) === 0)
				return false;

			// We don't care for connections from other runtimes
			let originRuntime = undefined;
			for (const r of chunkGraph.getModuleRuntimes(connection.originModule)) {
				originRuntime = mergeRuntimeOwned(originRuntime, r);
			}

			return intersectRuntime(runtime, originRuntime);
		});

		const nonHarmonyConnections = incomingConnections.filter(
			connection =>
				!connection.originModule ||
				!connection.dependency ||
				!(connection.dependency instanceof HarmonyImportDependency)
		);
		if (nonHarmonyConnections.length > 0) {
			const problem = requestShortener => {
				const importingModules = new Set(
					nonHarmonyConnections.map(c => c.originModule).filter(Boolean)
				);
				const importingExplanations = new Set(
					nonHarmonyConnections.map(c => c.explanation).filter(Boolean)
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
					return `Module ${module.readableIdentifier(
						requestShortener
					)} is referenced from these modules with unsupported syntax: ${names.join(
						", "
					)}`;
				} else if (names.length === 0 && explanations.length > 0) {
					return `Module ${module.readableIdentifier(
						requestShortener
					)} is referenced by: ${explanations.join(", ")}`;
				} else if (names.length > 0 && explanations.length > 0) {
					return `Module ${module.readableIdentifier(
						requestShortener
					)} is referenced from these modules with unsupported syntax: ${names.join(
						", "
					)} and by: ${explanations.join(", ")}`;
				} else {
					return `Module ${module.readableIdentifier(
						requestShortener
					)} is referenced in a unsupported way`;
				}
			};
			failureCache.set(module, problem); // cache failures for performance
			return problem;
		}

		// Module must be in the same chunks like the referencing module
		const otherChunkConnections = incomingConnections.filter(connection => {
			for (const chunk of chunkGraph.getModuleChunksIterable(
				config.rootModule
			)) {
				if (!chunkGraph.isModuleInChunk(connection.originModule, chunk)) {
					return true;
				}
			}
			return false;
		});
		if (otherChunkConnections.length > 0) {
			const problem = requestShortener => {
				const importingModules = new Set(
					otherChunkConnections.map(c => c.originModule)
				);
				const names = Array.from(importingModules)
					.map(m => m.readableIdentifier(requestShortener))
					.sort();
				return `Module ${module.readableIdentifier(
					requestShortener
				)} is referenced from different chunks by these modules: ${names.join(
					", "
				)}`;
			};
			failureCache.set(module, problem); // cache failures for performance
			return problem;
		}

		if (runtime !== undefined && typeof runtime !== "string") {
			// Module must be consistently referenced in the same runtimes
			/** @type {Map<Module, boolean | RuntimeSpec>} */
			const runtimeConditionMap = new Map();
			for (const connection of incomingConnections) {
				const runtimeCondition = filterRuntime(runtime, runtime => {
					return connection.isTargetActive(runtime);
				});
				if (runtimeCondition === false) continue;
				const old = runtimeConditionMap.get(connection.originModule) || false;
				if (old === true) continue;
				if (old !== false && runtimeCondition !== true) {
					runtimeConditionMap.set(
						connection.originModule,
						mergeRuntime(old, runtimeCondition)
					);
				} else {
					runtimeConditionMap.set(connection.originModule, runtimeCondition);
				}
			}
			const otherRuntimeConnections = Array.from(runtimeConditionMap).filter(
				([, runtimeCondition]) => typeof runtimeCondition !== "boolean"
			);
			if (otherRuntimeConnections.length > 0) {
				const problem = requestShortener => {
					return `Module ${module.readableIdentifier(
						requestShortener
					)} is runtime-dependent referenced by these modules: ${Array.from(
						otherRuntimeConnections,
						([module, runtimeCondition]) =>
							`${module.readableIdentifier(
								requestShortener
							)} (expected runtime ${runtimeToString(
								runtime
							)}, module is only referenced in ${runtimeToString(
								/** @type {RuntimeSpec} */ (runtimeCondition)
							)})`
					).join(", ")}`;
				};
				failureCache.set(module, problem); // cache failures for performance
				return problem;
			}
		}

		const incomingModules = Array.from(
			new Set(incomingConnections.map(c => c.originModule))
		).sort(compareModulesByIdentifier);

		// Every module which depends on the added module must be in the configuration too.
		for (const originModule of incomingModules) {
			const problem = this._tryToAdd(
				compilation,
				config,
				originModule,
				runtime,
				activeRuntime,
				possibleModules,
				candidates,
				failureCache,
				chunkGraph
			);
			if (problem) {
				failureCache.set(module, problem); // cache failures for performance
				return problem;
			}
		}

		// Add imports to possible candidates list
		for (const imp of this._getImports(compilation, module, runtime)) {
			candidates.add(imp);
		}
		return null;
	}
}

class ConcatConfiguration {
	/**
	 * @param {Module} rootModule the root module
	 * @param {RuntimeSpec} runtime the runtime
	 */
	constructor(rootModule, runtime) {
		this.rootModule = rootModule;
		this.runtime = runtime;
		/** @type {StackedMap<Module, true>} */
		this.modules = new StackedMap();
		this.modules.set(rootModule, true);
		/** @type {StackedMap<Module, Module | function(RequestShortener): string>} */
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
