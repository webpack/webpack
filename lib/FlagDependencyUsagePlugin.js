/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const addToSet = (a, b) => {
	b.forEach(item => {
		if(a.indexOf(item) < 0)
			a.push(item);
	});
	return a;
};

const isSubset = (biggerSet, subset) => {
	if(biggerSet === true) return true;
	if(subset === true) return false;
	return subset.every(item => biggerSet.indexOf(item) >= 0);
};

class FlagDependencyUsagePlugin {
	apply(compiler) {
		compiler.plugin("compilation", compilation => {
			compilation.plugin("optimize-modules-advanced", modules => {

				const processModule = (module, usedExports) => {
					module.used = true;
					if(module.usedExports === true)
						return;
					else if(usedExports === true)
						module.usedExports = true;
					else if(Array.isArray(usedExports)) {
						const old = module.usedExports ? module.usedExports.length : -1;
						module.usedExports = addToSet(module.usedExports || [], usedExports);
						if(module.usedExports.length === old)
							return;
					} else if(Array.isArray(module.usedExports))
						return;
					else
						module.usedExports = false;

					// for a module without side effects we stop tracking usage here when no export is used
					// This module won't be evaluated in this case
					if(module.sideEffectFree) {
						if(module.usedExports === false) return;
						if(Array.isArray(module.usedExports) && module.usedExports.length === 0) return;
					}

					queue.push([module, module.usedExports]);
				};

				const processDependenciesBlock = (depBlock, usedExports) => {
					depBlock.dependencies.forEach(dep => processDependency(dep));
					depBlock.variables.forEach(variable => variable.dependencies.forEach(dep => processDependency(dep)));
					depBlock.blocks.forEach(block => queue.push([block, usedExports]));
				};

				const processDependency = dep => {
					const reference = dep.getReference && dep.getReference();
					if(!reference) return;
					const module = reference.module;
					const importedNames = reference.importedNames;
					const oldUsed = module.used;
					const oldUsedExports = module.usedExports;
					if(!oldUsed || (importedNames && (!oldUsedExports || !isSubset(oldUsedExports, importedNames)))) {
						processModule(module, importedNames);
					}
				};

				modules.forEach(module => module.used = false);

				const queue = [];
				compilation.chunks.forEach(chunk => {
					if(chunk.entryModule) {
						processModule(chunk.entryModule, true);
					}
				});

				while(queue.length) {
					const queueItem = queue.pop();
					processDependenciesBlock(queueItem[0], queueItem[1]);
				}
			});
		});
	}
}
module.exports = FlagDependencyUsagePlugin;
