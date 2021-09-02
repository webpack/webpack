/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");
const LazySet = require("../util/LazySet");
const LoaderDependency = require("./LoaderDependency");
const LoaderImportDependency = require("./LoaderImportDependency");

/** @typedef {import("../Compilation").DepConstructor} DepConstructor */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

/**
 * @callback LoadModuleCallback
 * @param {Error=} err error object
 * @param {string | Buffer=} source source code
 * @param {object=} map source map
 * @param {Module=} module loaded module if successful
 */

/**
 * @callback ImportModuleCallback
 * @param {Error=} err error object
 * @param {any=} exports exports of the evaluated module
 */

/**
 * @typedef {Object} ImportModuleOptions
 * @property {string=} layer the target layer
 * @property {string=} publicPath the target public path
 */

class LoaderPlugin {
	/**
	 * @param {Object} options options
	 */
	constructor(options = {}) {}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"LoaderPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					LoaderDependency,
					normalModuleFactory
				);
				compilation.dependencyFactories.set(
					LoaderImportDependency,
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
							/** @type {DepConstructor} */ (dep.constructor)
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
								if (referencedModule.getNumberOfErrors() > 0) {
									return callback(
										new Error("The loaded module contains errors")
									);
								}
								const moduleSource = referencedModule.originalSource();
								if (!moduleSource) {
									return callback(
										new Error(
											"The module created for a LoaderDependency must have an original source"
										)
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

					/**
					 * @param {string} request the request string to load the module from
					 * @param {ImportModuleOptions=} options options
					 * @param {ImportModuleCallback=} callback callback returning the exports
					 * @returns {void}
					 */
					const importModule = (request, options, callback) => {
						const dep = new LoaderImportDependency(request);
						dep.loc = {
							name: request
						};
						const factory = compilation.dependencyFactories.get(
							/** @type {DepConstructor} */ (dep.constructor)
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
								contextInfo: {
									issuerLayer: options.layer
								},
								context: loaderContext.context,
								connectOrigin: false
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
								compilation.executeModule(
									referencedModule,
									{
										entryOptions: {
											publicPath: options.publicPath
										}
									},
									(err, result) => {
										if (err) return callback(err);
										for (const d of result.fileDependencies) {
											loaderContext.addDependency(d);
										}
										for (const d of result.contextDependencies) {
											loaderContext.addContextDependency(d);
										}
										for (const d of result.missingDependencies) {
											loaderContext.addMissingDependency(d);
										}
										for (const d of result.buildDependencies) {
											loaderContext.addBuildDependency(d);
										}
										if (result.cacheable === false)
											loaderContext.cacheable(false);
										for (const [name, { source, info }] of result.assets) {
											const { buildInfo } = loaderContext._module;
											if (!buildInfo.assets) {
												buildInfo.assets = Object.create(null);
												buildInfo.assetsInfo = new Map();
											}
											buildInfo.assets[name] = source;
											buildInfo.assetsInfo.set(name, info);
										}
										callback(null, result.exports);
									}
								);
							}
						);
					};

					/**
					 * @param {string} request the request string to load the module from
					 * @param {ImportModuleOptions} options options
					 * @param {ImportModuleCallback=} callback callback returning the exports
					 * @returns {Promise<any> | void} exports
					 */
					loaderContext.importModule = (request, options, callback) => {
						if (!callback) {
							return new Promise((resolve, reject) => {
								importModule(request, options || {}, (err, result) => {
									if (err) reject(err);
									else resolve(result);
								});
							});
						}
						return importModule(request, options || {}, callback);
					};
				}
			);
		});
	}
}
module.exports = LoaderPlugin;
