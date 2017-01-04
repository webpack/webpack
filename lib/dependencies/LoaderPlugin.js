"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const LoaderDependency = require("./LoaderDependency");
class LoaderPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(LoaderDependency, normalModuleFactory);
		});
		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("normal-module-loader", function(loaderContext, module) {
				loaderContext.loadModule = function loadModule(request, callback) {
					const dep = new LoaderDependency(request);
					dep.loc = request;
					compilation.addModuleDependencies(module, [[dep]], true, "lm", false, function(err) {
						if(err) {
							return callback(err);
						}
						if(!dep.module) {
							return callback(new Error("Cannot load the module"));
						}
						if(dep.module.building) {
							dep.module.building.push(next);
						} else {
							next();
						}
						function next(err) {
							if(err) {
								return callback(err);
							}
							if(dep.module.error) {
								return callback(dep.module.error);
							}
							if(!dep.module._source) {
								throw new Error("The module created for a LoaderDependency must have a property _source");
							}
							let source;
							let map;
							const moduleSource = dep.module._source;
							if(moduleSource.sourceAndMap) {
								const sourceAndMap = moduleSource.sourceAndMap();
								map = sourceAndMap.map;
								source = sourceAndMap.source;
							} else {
								map = moduleSource.map();
								source = moduleSource.source();
							}
							if((dep.module).fileDependencies) {
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
	}
}
module.exports = LoaderPlugin;
