/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const addToSet = (a, b) => {
	for (const item of b) {
		if (!a.includes(item)) a.push(item);
	}
	return a;
};

const isSubset = (biggerSet, subset) => {
	if (biggerSet === true) return true;
	if (subset === true) return false;
	return subset.every(item => biggerSet.indexOf(item) >= 0);
};

class FlagDependencyUsagePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("FlagDependencyUsagePlugin", compilation => {
			compilation.hooks.optimizeDependencies.tap(
				"FlagDependencyUsagePlugin",
				modules => {
					const processModule = (module, usedExports) => {
						module.used = true;
						if (module.usedExports === true) return;
						if (usedExports === true) {
							module.usedExports = true;
						} else if (Array.isArray(usedExports)) {
							const old = module.usedExports ? module.usedExports.length : -1;
							module.usedExports = addToSet(
								module.usedExports || [],
								usedExports
							);
							if (module.usedExports.length === old) {
								return;
							}
						} else if (Array.isArray(module.usedExports)) {
							return;
						} else {
							module.usedExports = false;
						}

						// for a module without side effects we stop tracking usage here when no export is used
						// This module won't be evaluated in this case
						if (module.factoryMeta.sideEffectFree) {
							if (module.usedExports === false) return;
							if (
								Array.isArray(module.usedExports) &&
								module.usedExports.length === 0
							)
								return;
						}

						queue.push([module, module.usedExports]);
					};

					const processDependenciesBlock = (depBlock, usedExports) => {
						for (const dep of depBlock.dependencies) {
							processDependency(dep);
						}
						for (const variable of depBlock.variables) {
							for (const dep of variable.dependencies) {
								processDependency(dep);
							}
						}
						for (const block of depBlock.blocks) {
							queue.push([block, usedExports]);
						}
					};

					const processDependency = dep => {
						const reference = dep.getReference && dep.getReference();
						if (!reference) return;
						const module = reference.module;
						const importedNames = reference.importedNames;
						const oldUsed = module.used;
						const oldUsedExports = module.usedExports;
						if (
							!oldUsed ||
							(importedNames &&
								(!oldUsedExports || !isSubset(oldUsedExports, importedNames)))
						) {
							processModule(module, importedNames);
						}
					};

					for (const module of modules) {
						module.used = false;
					}

					const queue = [];
					for (const preparedEntrypoint of compilation._preparedEntrypoints) {
						if (preparedEntrypoint.module) {
							processModule(preparedEntrypoint.module, true);
						}
					}

					while (queue.length) {
						const queueItem = queue.pop();
						processDependenciesBlock(queueItem[0], queueItem[1]);
					}
				}
			);
		});
	}
}
module.exports = FlagDependencyUsagePlugin;
