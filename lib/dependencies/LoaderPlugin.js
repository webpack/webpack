/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const LoaderDependency = require("./LoaderDependency");

class LoaderPlugin {

	apply(compiler) {
		compiler.hooks.compilation.tap("LoaderPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(LoaderDependency, normalModuleFactory);
		});

		compiler.hooks.compilation.tap("LoaderPlugin", (compilation) => {
			compilation.hooks.normalModuleLoader.tap("LoaderPlugin", (loaderContext, module) => {
				loaderContext.loadModule = (request, callback) => {
					const dep = new LoaderDependency(request);
					dep.loc = request;
					const factory = compilation.dependencyFactories.get(dep.constructor);
					if(factory === undefined)
						return callback(new Error(`No module factory available for dependency type: ${dep.constructor.name}`));
					compilation.addModuleDependencies(module, [{
						factory,
						dependencies: [dep]
					}], true, "lm", false, err => {
						if(err) return callback(err);

						if(!dep.module) return callback(new Error("Cannot load the module"));

						if(dep.module.error) return callback(dep.module.error);
						if(!dep.module._source) throw new Error("The module created for a LoaderDependency must have a property _source");
						let source, map;
						const moduleSource = dep.module._source;
						if(moduleSource.sourceAndMap) {
							const sourceAndMap = moduleSource.sourceAndMap();
							map = sourceAndMap.map;
							source = sourceAndMap.source;
						} else {
							map = moduleSource.map();
							source = moduleSource.source();
						}
						if(dep.module.buildInfo.fileDependencies) {
							dep.module.buildInfo.fileDependencies.forEach(dep => loaderContext.addDependency(dep));
						}
						if(dep.module.buildInfo.contextDependencies) {
							dep.module.buildInfo.contextDependencies.forEach(dep => loaderContext.addContextDependency(dep));
						}
						return callback(null, source, map, dep.module);
					});
				};
			});
		});
	}
}
module.exports = LoaderPlugin;
