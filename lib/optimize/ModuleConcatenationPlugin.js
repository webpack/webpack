/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const ModuleHotAcceptDependency = require("../dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("../dependencies/ModuleHotDeclineDependency");
const ConcatenatedModule = require("./ConcatenatedModule");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");

function formatBailoutReason(msg) {
	return "ModuleConcatenation bailout: " + msg;
}

class ModuleConcatenationPlugin {
	constructor(options) {
		if(typeof options !== "object") options = {};
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
				parser.plugin("call eval", () => {
					parser.state.module.meta.hasEval = true;
				});
			});
			const bailoutReasonMap = new Map();

			function setBailoutReason(module, reason) {
				bailoutReasonMap.set(module, reason);
				module.optimizationBailout.push(typeof reason === "function" ? (rs) => formatBailoutReason(reason(rs)) : formatBailoutReason(reason));
			}

			function getBailoutReason(module, requestShortener) {
				const reason = bailoutReasonMap.get(module);
				if(typeof reason === "function") return reason(requestShortener);
				return reason;
			}

			compilation.plugin("optimize-chunk-modules", (chunks, modules) => {
				const relevantModules = [];
				const possibleInners = new Set();
				for(const module of modules) {
					// Only harmony modules are valid for optimization
					if(!module.meta || !module.meta.harmonyModule || !module.dependencies.some(d => d instanceof HarmonyCompatibilityDependency)) {
						setBailoutReason(module, "Module is not an ECMAScript module");
						continue;
					}

					// Because of variable renaming we can't use modules with eval
					if(module.meta && module.meta.hasEval) {
						setBailoutReason(module, "Module uses eval()");
						continue;
					}

					// Exports must be known (and not dynamic)
					if(!Array.isArray(module.providedExports)) {
						setBailoutReason(module, "Module exports are unknown");
						continue;
					}

					// Using dependency variables is not possible as this wraps the code in a function
					if(module.variables.length > 0) {
						setBailoutReason(module, `Module uses injected variables (${module.variables.map(v => v.name).join(", ")})`);
						continue;
					}

					// Hot Module Replacement need it's own module to work correctly
					if(module.dependencies.some(dep => dep instanceof ModuleHotAcceptDependency || dep instanceof ModuleHotDeclineDependency)) {
						setBailoutReason(module, "Module uses Hot Module Replacement");
						continue;
					}

					relevantModules.push(module);

					// Module must not be the entry points
					if(module.getChunks().some(chunk => chunk.entryModule === module)) {
						setBailoutReason(module, "Module is an entry point");
						continue;
					}

					// Module must only be used by Harmony Imports
					const nonHarmonyReasons = module.reasons.filter(reason => !(reason.dependency instanceof HarmonyImportDependency));
					if(nonHarmonyReasons.length > 0) {
						const importingModules = new Set(nonHarmonyReasons.map(r => r.module));
						const importingModuleTypes = new Map(Array.from(importingModules).map(m => [m, new Set(nonHarmonyReasons.filter(r => r.module === m).map(r => r.dependency.type).sort())]));
						setBailoutReason(module, (requestShortener) => {
							const names = Array.from(importingModules).map(m => `${m.readableIdentifier(requestShortener)} (referenced with ${Array.from(importingModuleTypes.get(m)).join(", ")})`).sort();
							return `Module is referenced from these modules with unsupported syntax: ${names.join(", ")}`;
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
				for(const currentRoot of relevantModules) {
					// when used by another configuration as inner:
					// the other configuration is better and we can skip this one
					if(usedAsInner.has(currentRoot))
						continue;

					// create a configuration with the root
					const currentConfiguration = new ConcatConfiguration(currentRoot);

					// cache failures to add modules
					const failureCache = new Map();

					// try to add all imports
					for(const imp of this.getImports(currentRoot)) {
						const problem = this.tryToAdd(currentConfiguration, imp, possibleInners, failureCache);
						if(problem) {
							failureCache.set(imp, problem);
							currentConfiguration.addWarning(imp, problem);
						}
					}
					if(!currentConfiguration.isEmpty()) {
						concatConfigurations.push(currentConfiguration);
						for(const module of currentConfiguration.modules) {
							if(module !== currentConfiguration.rootModule)
								usedAsInner.add(module);
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
				for(const concatConfiguration of concatConfigurations) {
					if(usedModules.has(concatConfiguration.rootModule))
						continue;
					const newModule = new ConcatenatedModule(concatConfiguration.rootModule, Array.from(concatConfiguration.modules));
					concatConfiguration.sortWarnings();
					for(const warning of concatConfiguration.warnings) {
						newModule.optimizationBailout.push((requestShortener) => {
							const reason = getBailoutReason(warning[0], requestShortener);
							const reasonWithPrefix = reason ? ` (<- ${reason})` : "";
							if(warning[0] === warning[1])
								return formatBailoutReason(`Cannot concat with ${warning[0].readableIdentifier(requestShortener)}${reasonWithPrefix}`);
							else
								return formatBailoutReason(`Cannot concat with ${warning[0].readableIdentifier(requestShortener)} because of ${warning[1].readableIdentifier(requestShortener)}${reasonWithPrefix}`);
						});
					}
					const chunks = concatConfiguration.rootModule.getChunks();
					for(const m of concatConfiguration.modules) {
						usedModules.add(m);
						chunks.forEach(chunk => chunk.removeModule(m));
					}
					chunks.forEach(chunk => {
						chunk.addModule(newModule);
						newModule.addChunk(chunk);
						if(chunk.entryModule === concatConfiguration.rootModule)
							chunk.entryModule = newModule;
					});
					compilation.modules.push(newModule);
					newModule.reasons.forEach(reason => reason.dependency.module = newModule);
					newModule.dependencies.forEach(dep => {
						if(dep.module) {
							dep.module.reasons.forEach(reason => {
								if(reason.dependency === dep)
									reason.module = newModule;
							});
						}
					});
				}
				compilation.modules = compilation.modules.filter(m => !usedModules.has(m));
			});
		});
	}

	getImports(module) {
		return Array.from(new Set(module.dependencies

			// Only harmony Dependencies
			.filter(dep => dep instanceof HarmonyImportDependency && dep.module)

			// Dependencies are simple enough to concat them
			.filter(dep => {
				return !module.dependencies.some(d =>
					d instanceof HarmonyExportImportedSpecifierDependency &&
					d.importDependency === dep &&
					!d.id &&
					!Array.isArray(dep.module.providedExports)
				);
			})

			// Take the imported module
			.map(dep => dep.module)
		));
	}

	tryToAdd(config, module, possibleModules, failureCache) {
		const cacheEntry = failureCache.get(module);
		if(cacheEntry) {
			return cacheEntry;
		}

		// Already added?
		if(config.has(module)) {
			return null;
		}

		// Not possible to add?
		if(!possibleModules.has(module)) {
			failureCache.set(module, module); // cache failures for performance
			return module;
		}

		// module must be in the same chunks
		if(!config.rootModule.hasEqualsChunks(module)) {
			failureCache.set(module, module); // cache failures for performance
			return module;
		}

		// Clone config to make experimental changes
		const testConfig = config.clone();

		// Add the module
		testConfig.add(module);

		// Every module which depends on the added module must be in the configuration too.
		for(const reason of module.reasons) {
			const problem = this.tryToAdd(testConfig, reason.module, possibleModules, failureCache);
			if(problem) {
				failureCache.set(module, problem); // cache failures for performance
				return problem;
			}
		}

		// Eagerly try to add imports too if possible
		for(const imp of this.getImports(module)) {
			const problem = this.tryToAdd(testConfig, imp, possibleModules, failureCache);
			if(problem) {
				config.addWarning(module, problem);
			}
		}

		// Commit experimental changes
		config.set(testConfig);
		return null;
	}
}

class ConcatConfiguration {
	constructor(rootModule) {
		this.rootModule = rootModule;
		this.modules = new Set([rootModule]);
		this.warnings = new Map();
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

	sortWarnings() {
		this.warnings = new Map(Array.from(this.warnings).sort((a, b) => {
			const ai = a[0].identifier();
			const bi = b[0].identifier();
			if(ai < bi) return -1;
			if(ai > bi) return 1;
			return 0;
		}));
	}

	clone() {
		const clone = new ConcatConfiguration(this.rootModule);
		for(const module of this.modules)
			clone.add(module);
		for(const pair of this.warnings)
			clone.addWarning(pair[0], pair[1]);
		return clone;
	}

	set(config) {
		this.rootModule = config.rootModule;
		this.modules = new Set(config.modules);
		this.warnings = new Map(config.warnings);
	}
}

module.exports = ModuleConcatenationPlugin;
