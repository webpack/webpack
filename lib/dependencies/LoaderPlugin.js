/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");
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
			compilation.hooks.normalModuleLoader.tap(
				"LoaderPlugin",
				(loaderContext, module) => {
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
									`No module factory available for dependency type: ${
										dep.constructor.name
									}`
								)
							);
						}
						compilation.semaphore.release();
						compilation.addModuleDependencies(
							module,
							[
								{
									factory,
									dependencies: [dep]
								}
							],
							true,
							err => {
								compilation.semaphore.acquire(() => {
									if (err) {
										return callback(err);
									}
									const referencedModule = moduleGraph.getModule(dep);
									if (!referencedModule) {
										return callback(new Error("Cannot load the module"));
									}
									// TODO consider removing this in webpack 5
									if (
										referencedModule instanceof NormalModule &&
										referencedModule.error
									) {
										return callback(referencedModule.error);
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
									if (referencedModule.buildInfo.fileDependencies) {
										for (const d of referencedModule.buildInfo
											.fileDependencies) {
											loaderContext.addDependency(d);
										}
									}
									if (referencedModule.buildInfo.contextDependencies) {
										for (const d of referencedModule.buildInfo
											.contextDependencies) {
											loaderContext.addContextDependency(d);
										}
									}
									return callback(null, source, map, referencedModule);
								});
							}
						);
					};
				}
			);
		});
	}
}
module.exports = LoaderPlugin;
