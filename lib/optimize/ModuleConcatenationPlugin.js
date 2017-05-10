/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const ConcatenatedModule = require("./ConcatenatedModule");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");

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
			compilation.plugin("optimize-chunk-modules", (chunks, modules) => {
				chunks.forEach(chunk => {
					const relevantModules = chunk.mapModules(m => m).filter(module => {
						// Module must not be in other chunks
						// TODO add an option to allow module to be in other entry points
						if(module.getNumberOfChunks() !== 1)
							return false;

						// Because of variable renaming we can't use modules with eval
						if(module.meta && module.meta.hasEval)
							return false;

						return true;
					});
					const possibleInners = new Set(relevantModules.filter(module => {
						// Module must not be the entry points
						if(chunk.entryModule === module)
							return false;

						// Exports must be known (and not dynamic)
						if(!Array.isArray(module.providedExports))
							return false;

						// Using dependency variables is not possible as this wraps the code in a function
						if(module.variables.length > 0)
							return false;

						// Module must only be used by Harmony Imports
						if(!module.reasons.every(reason => reason.dependency instanceof HarmonyImportDependency))
							return false;

						// It must be statically known which exports are provided or used
						if(!Array.isArray(module.providedExports))
							return false;

						return true;
					}));
					const possibleRoots = relevantModules.filter(module => {
						return true;
					});
					const concatConfigurations = [];
					while(possibleRoots.length) {
						const currentRoot = possibleRoots.pop();
						// console.log("#process", currentRoot.debugId, currentRoot.resource);
						const currentConfiguration = new ConcatConfiguration(currentRoot);
						for(let imp of this.getImports(currentRoot)) {
							this.tryToAdd(currentConfiguration, imp, possibleInners);
						}
						if(!currentConfiguration.isEmpty())
							concatConfigurations.push(currentConfiguration);
					}
					concatConfigurations.sort((a, b) => {
						return b.modules.size - a.modules.size;
					});
					const usedModules = new Set();
					for(const config of concatConfigurations) {
						if(usedModules.has(config.rootModule))
							continue;
						const orderedModules = new Set();
						this.addInOrder(config.rootModule, config.modules, orderedModules);
						const newModule = new ConcatenatedModule(config.rootModule, Array.from(orderedModules));
						for(const m of orderedModules) {
							usedModules.add(m);
							chunk.removeModule(m);
						}
						chunk.addModule(newModule);
						compilation.modules.push(newModule);
						if(chunk.entryModule === config.rootModule)
							chunk.entryModule = newModule;
						config.rootModule.reasons.forEach(reason => {
							if(!config.modules.has(reason.module))
								reason.dependency.module = newModule;
						});
					}
				});
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

	tryToAdd(config, module, possibleModules) {
		// console.log("tryToAdd", module.debugId, module.resource);

		// Already added?
		if(config.has(module)) {
			// console.log("already added");
			return true;
		}

		// Not possible to add?
		if(!possibleModules.has(module)) {
			// console.log("not possible");
			return false;
		}

		// Clone config to make experimental changes
		const testConfig = config.clone();

		// Add the module
		testConfig.add(module);

		// Every module which depends on the added module must be in the configuration too.
		// console.log("reasons start");
		for(const reason of module.reasons) {
			if(!this.tryToAdd(testConfig, reason.module, possibleModules)) {
				// console.log("reason failed");
				return false;
			}
		}
		// console.log("reasons end");

		// Eagerly try to add imports too if possible
		// console.log("imports start");
		for(const imp of this.getImports(module))
			this.tryToAdd(testConfig, imp, possibleModules);
		// console.log("imports end");

		// console.log("commit");
		// Commit experimental changes
		config.set(testConfig);
		return true;
	}

	addInOrder(module, unorderedSet, orderedSet) {
		if(orderedSet.has(module)) return;
		if(!unorderedSet.has(module)) return;
		orderedSet.add(module);
		for(const imp of this.getImports(module))
			this.addInOrder(imp, unorderedSet, orderedSet);
		orderedSet.delete(module);
		orderedSet.add(module);
	}
}

class ConcatConfiguration {
	constructor(rootModule) {
		this.rootModule = rootModule;
		this.modules = new Set([rootModule]);
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

	clone() {
		const clone = new ConcatConfiguration(this.rootModule);
		for(const module of this.modules)
			clone.add(module);
		return clone;
	}

	set(config) {
		this.rootModule = config.rootModule;
		this.modules = new Set(config.modules);
	}
}

module.exports = ModuleConcatenationPlugin;
