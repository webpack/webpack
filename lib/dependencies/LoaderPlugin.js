/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var LoaderDependency = require("./LoaderDependency");

function LoaderPlugin() {
}
module.exports = LoaderPlugin;

LoaderPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(LoaderDependency, normalModuleFactory);
	});
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("normal-module-loader", function(loaderContext, module) {
			loaderContext.loadModule = function loadModule(request, callback) {
				var dep = new LoaderDependency(request);
				dep.loc = request;
				compilation.addModuleDependencies(module, [[dep]], true, "lm", false, function(err) {
					if(err) return callback(err);

					module = dep.module;
					if(!module) return callback(new Error("Cannot load the module"));
					if(module.building) module.building.push(next);
					else next();

					function next(err) {
						if(err) return callback(err);

						if(dep.module.error) return callback(dep.module.error);
						if(!dep.module._source) throw new Error("The module created for a LoaderDependency must have a property _source");
						var source, map;
						var moduleSource = dep.module._source;
						if(moduleSource.sourceAndMap) {
							var sourceAndMap = moduleSource.sourceAndMap();
							map = sourceAndMap.map;
							source = sourceAndMap.source;
						} else {
							map = moduleSource.map();
							source = moduleSource.source();
						}
						if(dep.module.fileDependencies) {
							dep.module.fileDependencies.forEach(function(dep) {
								loaderContext.addDependency(dep);
							});
						}
						if(dep.module.contextDependencies) {
							dep.module.contextDependencies.forEach(function(dep) {
								loaderContext.addContextDependency(dep);
							});
						}
						return callback(null, source, map, dep.module);
					}
				});
			};
		});
	});
};
