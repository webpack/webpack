/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function FlagDependencyUsagePlugin() {

}
module.exports = FlagDependencyUsagePlugin;

FlagDependencyUsagePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-modules-advanced", function(modules) {

			modules.forEach(function(module) {
				module.used = false;
			})

			compilation.chunks.forEach(function(chunk) {
				if(chunk.entryModule) {
					processModule(chunk.entryModule, true);
				}
			});

		});

		function processModule(module, usedExports) {
			module.used = true;
			if(usedExports === true || module.usedExports === true)
				module.usedExports = true;
			else if(Array.isArray(usedExports))
				module.usedExports = addToSet(module.usedExports || [], usedExports)
			else if(Array.isArray(module.usedExports))
				module.usedExports = module.usedExports;
			else
				module.usedExports = false;

			processDependenciesBlock(module, module.usedExports);
		}

		function processDependenciesBlock(depBlock, usedExports) {
			depBlock.dependencies.forEach(function(dep) {
				processDependency(dep, usedExports);
			});
			depBlock.variables.forEach(function(variable) {
				variable.dependencies.forEach(function(dep) {
					processDependency(dep, usedExports);
				});
			});
			depBlock.blocks.forEach(function(block) {
				processDependenciesBlock(block, usedExports);
			});
		}

		function processDependency(dep, usedExports) {
			var reference = dep.getReference();
			if(!reference) return;
			var module = reference.module;
			var importedNames = reference.importedNames;
			var oldUsed = module.used;
			var oldUsedExports = module.usedExports;
			if(!oldUsed || (importedNames && (!oldUsedExports || !isSubset(oldUsedExports, importedNames)))) {
				processModule(module, importedNames);
			}
		}

		function addToSet(a, b) {
			b.forEach(function(item) {
				if(a.indexOf(item) < 0)
					a.push(item);
			});
			return a;
		}

		function isSubset(biggerSet, subset) {
			if(biggerSet === true) return true;
			if(subset === true) return false;
			return subset.every(function(item) {
				return biggerSet.indexOf(item) >= 0;
			});
		}
	});
};
