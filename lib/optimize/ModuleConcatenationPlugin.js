/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_DEFAULT } = require("../OptimizationStages");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const ModuleHotAcceptDependency = require("../dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("../dependencies/ModuleHotDeclineDependency");
const StackedSetMap = require("../util/StackedSetMap");
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
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ModuleConcatenationPlugin",
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;

				const handler = (parser, parserOptions) => {
					parser.hooks.call.for("eval").tap("ModuleConcatenationPlugin", () => {
						// Because of variable renaming we can't use modules with eval.
						parser.state.module.buildMeta.moduleConcatenationBailout = "eval()";
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ModuleConcatenationPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ModuleConcatenationPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ModuleConcatenationPlugin", handler);

				const bailoutReasonMap = new Map();

				const setBailoutReason = (module, reason) => {
					setInnerBailoutReason(module, reason);
					module
						.getOptimizationBailout(moduleGraph)
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

				compilation.hooks.optimizeChunkModules.tap(
					/** @type {TODO} */ ({
						name: "ModuleConcatenationPlugin",
						stage: STAGE_DEFAULT
					}),
					(chunks, modules) => {
						const chunkGraph = compilation.chunkGraph;
						const relevantModules = [];
						const possibleInners = new Set();
						for (const module of modules) {
							// Only harmony modules are valid for optimization
							if (
								!module.buildMeta ||
								module.buildMeta.exportsType !== "namespace" ||
								!module.dependencies.some(
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
								module.buildMeta &&
								module.buildMeta.moduleConcatenationBailout
							) {
								setBailoutReason(
									module,
									`Module uses ${module.buildMeta.moduleConcatenationBailout}`
								);
								continue;
							}

							// Exports must be known (and not dynamic)
							if (!Array.isArray(module.buildMeta.providedExports)) {
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

							const incomingConnections = moduleGraph
								.getIncomingConnections(module)
								.filter(connection => {
									return (
										!connection.originModule ||
										connection.originModule.isModuleUsed(moduleGraph)
									);
								});

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
											m => /** @type {[Module, Set<string>]} */ ([
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
						// sort by depth
						// modules with lower depth are more likely suited as roots
						// this improves performance, because modules already selected as inner are skipped
						relevantModules.sort((a, b) => {
							return a.depth - b.depth;
						});
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

							// try to add all imports
							for (const imp of this._getImports(compilation, currentRoot)) {
								const problem = this._tryToAdd(
									compilation,
									currentConfiguration,
									imp,
									possibleInners,
									failureCache
								);
								if (problem) {
									failureCache.set(imp, problem);
									currentConfiguration.addWarning(imp, problem);
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
								for (const warning of currentConfiguration.getWarningsSorted()) {
									currentRoot
										.getOptimizationBailout(moduleGraph)
										.push(formatBailoutWarning(warning[0], warning[1]));
								}
							}
						}
						// HACK: Sort configurations by length and start with the longest one
						// to get the biggers groups possible. Used modules are marked with usedModules
						// TODO: Allow to reuse existing configuration while trying to add dependencies.
						// This would improve performance. O(n^2) -> O(n)
						concatConfigurations.sort((a, b) => {
							return b.modules.size - a.modules.size;
						});
						const usedModules = new Set();
						for (const concatConfiguration of concatConfigurations) {
							if (usedModules.has(concatConfiguration.rootModule)) continue;
							const modules = concatConfiguration.getModules();
							const rootModule = concatConfiguration.rootModule;
							const newModule = new ConcatenatedModule(
								rootModule,
								modules,
								compilation
							);
							for (const warning of concatConfiguration.getWarningsSorted()) {
								newModule
									.getOptimizationBailout(moduleGraph)
									.push(formatBailoutWarning(warning[0], warning[1]));
							}
							for (const m of modules) {
								usedModules.add(m);
								// remove module from chunk
								chunkGraph.replaceModule(m, newModule);
								// replace module references with the concatenated module
								moduleGraph.replaceModule(m, newModule, c => {
									return !(
										c.dependency instanceof HarmonyImportDependency &&
										modules.has(c.originModule) &&
										modules.has(c.module)
									);
								});
							}
							// add concatenated module to the compilation
							compilation.modules.push(newModule);
						}
						compilation.modules = compilation.modules.filter(
							m => !usedModules.has(m)
						);
					}
				);
			}
		);
	}

	_getImports(compilation, module) {
		return new Set(
			module.dependencies

				// Get reference info only for harmony Dependencies
				.map(dep => {
					if (!(dep instanceof HarmonyImportDependency)) return null;
					if (!compilation) return dep.getReference(compilation.moduleGraph);
					return compilation.getDependencyReference(module, dep);
				})

				// Reference is valid and has a module
				// Dependencies are simple enough to concat them
				.filter(
					ref =>
						ref &&
						ref.module &&
						(Array.isArray(ref.importedNames) ||
							Array.isArray(ref.module.buildMeta.providedExports))
				)

				// Take the imported module
				.map(ref => ref.module)
		);
	}

	/**
	 * @param {Compilation} compilation webpack compilation
	 * @param {ConcatConfiguration} config concat configuration (will be modified when added)
	 * @param {Module} module the module to be added
	 * @param {Set<Module>} possibleModules modules that are candidates
	 * @param {Map<Module, Module>} failureCache cache for problematic modules to be more performant
	 * @returns {Module} the problematic module
	 */
	_tryToAdd(compilation, config, module, possibleModules, failureCache) {
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

		// Clone config to make experimental changes
		const testConfig = config.clone();

		// Add the module
		testConfig.add(module);

		const moduleGraph = compilation.moduleGraph;

		// Every module which depends on the added module must be in the configuration too.
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			// Modules that are not used can be ignored
			if (!connection.originModule.isModuleUsed(moduleGraph)) continue;

			const problem = this._tryToAdd(
				compilation,
				testConfig,
				connection.originModule,
				possibleModules,
				failureCache
			);
			if (problem) {
				failureCache.set(module, problem); // cache failures for performance
				return problem;
			}
		}

		// Commit experimental changes
		config.set(testConfig);

		// Eagerly try to add imports too if possible
		for (const imp of this._getImports(compilation, module)) {
			const problem = this._tryToAdd(
				compilation,
				config,
				imp,
				possibleModules,
				failureCache
			);
			if (problem) {
				config.addWarning(imp, problem);
			}
		}
		return null;
	}
}

class ConcatConfiguration {
	/**
	 *
	 * @param {Module} rootModule the root module
	 * @param {ConcatConfiguration=} cloneFrom base config
	 */
	constructor(rootModule, cloneFrom) {
		this.rootModule = rootModule;
		if (cloneFrom) {
			/** @type {StackedSetMap} */
			this.modules = cloneFrom.modules.createChild();
			/** @type {StackedSetMap} */
			this.warnings = cloneFrom.warnings.createChild();
		} else {
			/** @type {StackedSetMap} */
			this.modules = new StackedSetMap();
			this.modules.add(rootModule);
			/** @type {StackedSetMap} */
			this.warnings = new StackedSetMap();
		}
	}

	add(module) {
		this.modules.add(module);
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

	clone() {
		return new ConcatConfiguration(this.rootModule, this);
	}

	set(config) {
		this.rootModule = config.rootModule;
		this.modules = config.modules;
		this.warnings = config.warnings;
	}
}

module.exports = ModuleConcatenationPlugin;
