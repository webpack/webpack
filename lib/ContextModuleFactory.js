/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const { AsyncSeriesWaterfallHook, SyncWaterfallHook } = require("tapable");
const ContextModule = require("./ContextModule");
const ModuleFactory = require("./ModuleFactory");
const ContextElementDependency = require("./dependencies/ContextElementDependency");
const { join } = require("./util/fs");

/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./dependencies/ContextDependency")} ContextDependency */

const EMPTY_RESOLVE_OPTIONS = {};

module.exports = class ContextModuleFactory extends ModuleFactory {
	constructor(resolverFactory) {
		super();
		this.hooks = Object.freeze({
			/** @type {AsyncSeriesWaterfallHook<[TODO]>} */
			beforeResolve: new AsyncSeriesWaterfallHook(["data"]),
			/** @type {AsyncSeriesWaterfallHook<[TODO]>} */
			afterResolve: new AsyncSeriesWaterfallHook(["data"]),
			/** @type {SyncWaterfallHook<[string[]]>} */
			contextModuleFiles: new SyncWaterfallHook(["files"]),
			/** @type {AsyncSeriesWaterfallHook<[TODO[]]>} */
			alternatives: new AsyncSeriesWaterfallHook(["modules"])
		});
		this.resolverFactory = resolverFactory;
	}

	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const context = data.context;
		const dependencies = data.dependencies;
		const resolveOptions = data.resolveOptions;
		const dependency = /** @type {ContextDependency} */ (dependencies[0]);
		const fileDependencies = new Set();
		const missingDependencies = new Set();
		const contextDependencies = new Set();
		this.hooks.beforeResolve.callAsync(
			{
				context: context,
				dependencies: dependencies,
				resolveOptions,
				fileDependencies,
				missingDependencies,
				contextDependencies,
				...dependency.options
			},
			(err, beforeResolveResult) => {
				if (err) {
					return callback(err, {
						fileDependencies,
						missingDependencies,
						contextDependencies
					});
				}

				// Ignored
				if (!beforeResolveResult) {
					return callback(null, {
						fileDependencies,
						missingDependencies,
						contextDependencies
					});
				}

				const context = beforeResolveResult.context;
				const request = beforeResolveResult.request;
				const resolveOptions = beforeResolveResult.resolveOptions;

				let loaders,
					resource,
					loadersPrefix = "";
				const idx = request.lastIndexOf("!");
				if (idx >= 0) {
					let loadersRequest = request.substr(0, idx + 1);
					let i;
					for (
						i = 0;
						i < loadersRequest.length && loadersRequest[i] === "!";
						i++
					) {
						loadersPrefix += "!";
					}
					loadersRequest = loadersRequest
						.substr(i)
						.replace(/!+$/, "")
						.replace(/!!+/g, "!");
					if (loadersRequest === "") {
						loaders = [];
					} else {
						loaders = loadersRequest.split("!");
					}
					resource = request.substr(idx + 1);
				} else {
					loaders = [];
					resource = request;
				}

				const contextResolver = this.resolverFactory.get(
					"context",
					resolveOptions || EMPTY_RESOLVE_OPTIONS
				);
				const loaderResolver = this.resolverFactory.get(
					"loader",
					EMPTY_RESOLVE_OPTIONS
				);

				asyncLib.parallel(
					[
						callback => {
							contextResolver.resolve(
								{},
								context,
								resource,
								{
									fileDependencies,
									missingDependencies,
									contextDependencies
								},
								(err, result) => {
									if (err) return callback(err);
									callback(null, result);
								}
							);
						},
						callback => {
							asyncLib.map(
								loaders,
								(loader, callback) => {
									loaderResolver.resolve(
										{},
										context,
										loader,
										{
											fileDependencies,
											missingDependencies,
											contextDependencies
										},
										(err, result) => {
											if (err) return callback(err);
											callback(null, result);
										}
									);
								},
								callback
							);
						}
					],
					(err, result) => {
						if (err) {
							return callback(err, {
								fileDependencies,
								missingDependencies,
								contextDependencies
							});
						}

						this.hooks.afterResolve.callAsync(
							{
								addon:
									loadersPrefix +
									result[1].join("!") +
									(result[1].length > 0 ? "!" : ""),
								resource: result[0],
								resolveDependencies: this.resolveDependencies.bind(this),
								...beforeResolveResult
							},
							(err, result) => {
								if (err) {
									return callback(err, {
										fileDependencies,
										missingDependencies,
										contextDependencies
									});
								}

								// Ignored
								if (!result) {
									return callback(null, {
										fileDependencies,
										missingDependencies,
										contextDependencies
									});
								}

								return callback(null, {
									module: new ContextModule(result.resolveDependencies, result),
									fileDependencies,
									missingDependencies,
									contextDependencies
								});
							}
						);
					}
				);
			}
		);
	}

	resolveDependencies(fs, options, callback) {
		const cmf = this;
		let resource = options.resource;
		let resourceQuery = options.resourceQuery;
		let recursive = options.recursive;
		let regExp = options.regExp;
		let include = options.include;
		let exclude = options.exclude;
		if (!regExp || !resource) return callback(null, []);

		const addDirectory = (directory, callback) => {
			fs.readdir(directory, (err, files) => {
				if (err) return callback(err);
				files = files.map(file => file.normalize("NFC"));
				files = cmf.hooks.contextModuleFiles.call(files);
				if (!files || files.length === 0) return callback(null, []);
				asyncLib.map(
					files.filter(p => p.indexOf(".") !== 0),
					(segment, callback) => {
						const subResource = join(fs, directory, segment);

						if (!exclude || !subResource.match(exclude)) {
							fs.stat(subResource, (err, stat) => {
								if (err) {
									if (err.code === "ENOENT") {
										// ENOENT is ok here because the file may have been deleted between
										// the readdir and stat calls.
										return callback();
									} else {
										return callback(err);
									}
								}

								if (stat.isDirectory()) {
									if (!recursive) return callback();
									addDirectory.call(this, subResource, callback);
								} else if (
									stat.isFile() &&
									(!include || subResource.match(include))
								) {
									const obj = {
										context: resource,
										request:
											"." +
											subResource.substr(resource.length).replace(/\\/g, "/")
									};

									this.hooks.alternatives.callAsync(
										[obj],
										(err, alternatives) => {
											if (err) return callback(err);
											alternatives = alternatives
												.filter(obj => regExp.test(obj.request))
												.map(obj => {
													const dep = new ContextElementDependency(
														obj.request + resourceQuery,
														obj.request
													);
													dep.optional = true;
													return dep;
												});
											callback(null, alternatives);
										}
									);
								} else {
									callback();
								}
							});
						} else {
							callback();
						}
					},
					(err, result) => {
						if (err) return callback(err);

						if (!result) return callback(null, []);

						const flattenedResult = [];

						for (const item of result) {
							if (item) flattenedResult.push(...item);
						}

						callback(null, flattenedResult);
					}
				);
			});
		};

		addDirectory(resource, callback);
	}
};
