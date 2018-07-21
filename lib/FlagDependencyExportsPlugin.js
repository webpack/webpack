/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FlagDependencyExportsPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("finish-modules", (modules) => {
				const dependencies = Object.create(null);

				let module;
				let moduleWithExports;
				let moduleProvidedExports;
				const queue = modules.filter((m) => !m.providedExports);
				for(let i = 0; i < queue.length; i++) {
					module = queue[i];

					if(module.providedExports !== true) {
						moduleWithExports = module.meta && module.meta.harmonyModule;
						moduleProvidedExports = Array.isArray(module.providedExports) ? new Set(module.providedExports) : new Set();
						processDependenciesBlock(module);
						if(!moduleWithExports) {
							module.providedExports = true;
							notifyDependencies();
						} else if(module.providedExports !== true) {
							module.providedExports = Array.from(moduleProvidedExports);
						}
					}
				}

				function processDependenciesBlock(depBlock) {
					depBlock.dependencies.forEach((dep) => processDependency(dep));
					depBlock.variables.forEach((variable) => {
						variable.dependencies.forEach((dep) => processDependency(dep));
					});
					depBlock.blocks.forEach(processDependenciesBlock);
				}

				function processDependency(dep) {
					const exportDesc = dep.getExports && dep.getExports();
					if(!exportDesc) return;
					moduleWithExports = true;
					const exports = exportDesc.exports;
					const exportDeps = exportDesc.dependencies;
					if(exportDeps) {
						exportDeps.forEach((dep) => {
							const depIdent = dep.identifier();
							// if this was not yet initialized
							// initialize it as an array containing the module and stop
							const array = dependencies[depIdent];
							if(!array) {
								dependencies[depIdent] = [module];
								return;
							}

							// check if this module is known
							// if not, add it to the dependencies for this identifier
							if(array.indexOf(module) < 0)
								array.push(module);
						});
					}
					let changed = false;
					if(module.providedExports !== true) {
						if(exports === true) {
							module.providedExports = true;
							changed = true;
						} else if(Array.isArray(exports)) {
							changed = addToSet(moduleProvidedExports, exports);
						}
					}
					if(changed) {
						notifyDependencies();
					}
				}

				function notifyDependencies() {
					const deps = dependencies[module.identifier()];
					if(deps) {
						deps.forEach((dep) => queue.push(dep));
					}
				}
			});

			function addToSet(a, b) {
				let changed = false;
				b.forEach((item) => {
					if(!a.has(item)) {
						a.add(item);
						changed = true;
					}
				});
				return changed;
			}
		});
	}
}

module.exports = FlagDependencyExportsPlugin;
