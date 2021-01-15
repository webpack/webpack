/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");
const LazySet = require("../util/LazySet");
const LoaderDependency = require("./LoaderDependency");

/** @typedef {import("../Module")} Module */

/**
 * @callback LoadModuleCallback
 * @param {Error=} err error object
 * @param {string=} source source code
 * @param {object=} map source map
 * @param {Module=} module loaded module if successful
 */

class LoaderPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"LoaderPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					LoaderDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.compilation.tap("LoaderPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			NormalModule.getCompilationHooks(compilation).loader.tap(
				"LoaderPlugin",
				loaderContext => {
					/**
					 * @param {string} request the request string to load the module from
					 * @param {LoadModuleCallback} callback callback returning the loaded module or error
					 * @returns {void}
					 */
					loaderContext.loadModule = (request, callback) => {
						const dep = new LoaderDependency(request);
						dep.loc = {
							name: request
						};
						const factory = compilation.dependencyFactories.get(
							dep.constructor
						);
						if (factory === undefined) {
							return callback(
								new Error(
									`No module factory available for dependency type: ${dep.constructor.name}`
								)
							);
						}
						compilation.buildQueue.increaseParallelism();
						compilation.handleModuleCreation(
							{
								factory,
								dependencies: [dep],
								originModule: loaderContext._module,
								context: loaderContext.context,
								recursive: false
							},
							err => {
								compilation.buildQueue.decreaseParallelism();
								if (err) {
									return callback(err);
								}
								const referencedModule = moduleGraph.getModule(dep);
								if (!referencedModule) {
									return callback(new Error("Cannot load the module"));
								}
								const moduleSource = referencedModule.originalSource();
								if (!moduleSource) {
									throw new Error(
										"The module created for a LoaderDependency must have an original source"
									);
								}
								let source, map;
								if (moduleSource.sourceAndMap) {
									const sourceAndMap = moduleSource.sourceAndMap();
									map = sourceAndMap.map;
									source = sourceAndMap.source;
								} else {
									map = moduleSource.map();
									source = moduleSource.source();
								}
								const fileDependencies = new LazySet();
								const contextDependencies = new LazySet();
								const missingDependencies = new LazySet();
								const buildDependencies = new LazySet();
								referencedModule.addCacheDependencies(
									fileDependencies,
									contextDependencies,
									missingDependencies,
									buildDependencies
								);

								for (const d of fileDependencies) {
									loaderContext.addDependency(d);
								}
								for (const d of contextDependencies) {
									loaderContext.addContextDependency(d);
								}
								for (const d of missingDependencies) {
									loaderContext.addMissingDependency(d);
								}
								for (const d of buildDependencies) {
									loaderContext.addBuildDependency(d);
								}
								return callback(null, source, map, referencedModule);
							}
						);
					};
				}
			);
		});
	}
}
module.exports = LoaderPlugin;
