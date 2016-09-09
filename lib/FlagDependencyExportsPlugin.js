/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function FlagDependencyExportsPlugin() {

}
module.exports = FlagDependencyExportsPlugin;

FlagDependencyExportsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("finish-modules", function(modules) {

			var dependencies = {};

			var module, moduleWithExports;
			var queue = modules.filter(function(m) {
				return !m.providedExports;
			});
			for(var i = 0; i < queue.length; i++) {
				module = queue[i];

				if(module.providedExports !== true) {
					moduleWithExports = false;
					processDependenciesBlock(module);
					if(!moduleWithExports) {
						module.providedExports = true;
						notifyDependencies();
					}
				}
			}

			function processDependenciesBlock(depBlock) {
				depBlock.dependencies.forEach(function(dep) {
					processDependency(dep);
				});
				depBlock.variables.forEach(function(variable) {
					variable.dependencies.forEach(function(dep) {
						processDependency(dep);
					});
				});
				depBlock.blocks.forEach(function(block) {
					processDependenciesBlock(block);
				});
			}

			function processDependency(dep, usedExports) {
				var exportDesc = dep.getExports && dep.getExports();
				if(!exportDesc) return;
				moduleWithExports = true;
				var exports = exportDesc.exports;
				var exportDeps = exportDesc.dependencies;
				if(exportDeps) {
					exportDeps.forEach(function(dep) {
						var depIdent = dep.identifier();
						var array = dependencies["$" + depIdent];
						if(!array) array = dependencies["$" + depIdent] = [];
						if(array.indexOf(module) < 0)
							array.push(module);
					});
				}
				var changed = false;
				if(module.providedExports !== true) {
					if(exports === true) {
						module.providedExports = true;
						changed = true;
					} else if(Array.isArray(exports)) {
						if(Array.isArray(module.providedExports)) {
							changed = addToSet(module.providedExports, exports);
						} else {
							module.providedExports = exports.slice();
							changed = true;
						}
					};
				}
				if(changed) {
					notifyDependencies();
				}
			}

			function notifyDependencies() {
				var deps = dependencies["$" + module.identifier()];
				if(deps) {
					deps.forEach(function(dep) {
						queue.push(dep);
					});
				}
			}
		});

		function addToSet(a, b) {
			var changed = false;
			b.forEach(function(item) {
				if(a.indexOf(item) < 0) {
					a.push(item);
					changed = true;
				}
			});
			return changed;
		}
	});
};
