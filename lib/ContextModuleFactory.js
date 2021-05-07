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
const LazySet = require("./util/LazySet");
const { cachedSetProperty } = require("./util/cleverMerge");
const { createFakeHook } = require("./util/deprecation");
const { join } = require("./util/fs");

/** @typedef {import("./ContextModule").ContextModuleOptions} ContextModuleOptions */
/** @typedef {import("./ContextModule").ResolveDependenciesCallback} ResolveDependenciesCallback */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./ResolverFactory")} ResolverFactory */
/** @typedef {import("./dependencies/ContextDependency")} ContextDependency */
/** @template T @typedef {import("./util/deprecation").FakeHook<T>} FakeHook<T> */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

const EMPTY_RESOLVE_OPTIONS = {};

module.exports = class ContextModuleFactory extends ModuleFactory {
	/**
	 * @param {ResolverFactory} resolverFactory resolverFactory
	 */
	constructor(resolverFactory) {
		super();
		/** @type {AsyncSeriesWaterfallHook<[TODO[], ContextModuleOptions]>} */
		const alternativeRequests = new AsyncSeriesWaterfallHook([
			"modules",
			"options"
		]);
		this.hooks = Object.freeze({
			/** @type {AsyncSeriesWaterfallHook<[TODO]>} */
			beforeResolve: new AsyncSeriesWaterfallHook(["data"]),
			/** @type {AsyncSeriesWaterfallHook<[TODO]>} */
			afterResolve: new AsyncSeriesWaterfallHook(["data"]),
			/** @type {SyncWaterfallHook<[string[]]>} */
			contextModuleFiles: new SyncWaterfallHook(["files"]),
			/** @type {FakeHook<Pick<AsyncSeriesWaterfallHook<[TODO[]]>, "tap" | "tapAsync" | "tapPromise" | "name">>} */
			alternatives: createFakeHook(
				{
					name: "alternatives",
					/** @type {AsyncSeriesWaterfallHook<[TODO[]]>["intercept"]} */
					intercept: interceptor => {
						throw new Error(
							"Intercepting fake hook ContextModuleFactory.hooks.alternatives is not possible, use ContextModuleFactory.hooks.alternativeRequests instead"
						);
					},
					/** @type {AsyncSeriesWaterfallHook<[TODO[]]>["tap"]} */
					tap: (options, fn) => {
						alternativeRequests.tap(options, fn);
					},
					/** @type {AsyncSeriesWaterfallHook<[TODO[]]>["tapAsync"]} */
					tapAsync: (options, fn) => {
						alternativeRequests.tapAsync(options, (items, _options, callback) =>
							fn(items, callback)
						);
					},
					/** @type {AsyncSeriesWaterfallHook<[TODO[]]>["tapPromise"]} */
					tapPromise: (options, fn) => {
						alternativeRequests.tapPromise(options, fn);
					}
				},
				"ContextModuleFactory.hooks.alternatives has deprecated in favor of ContextModuleFactory.hooks.alternativeRequests with an additional options argument.",
				"DEP_WEBPACK_CONTEXT_MODULE_FACTORY_ALTERNATIVES"
			),
			alternativeRequests
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
		const fileDependencies = new LazySet();
		const missingDependencies = new LazySet();
		const contextDependencies = new LazySet();
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
					dependencies.length > 0
						? cachedSetProperty(
								resolveOptions || EMPTY_RESOLVE_OPTIONS,
								"dependencyType",
								dependencies[0].category
						  )
						: resolveOptions
				);
				const loaderResolver = this.resolverFactory.get("loader");

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

	/**
	 * @param {InputFileSystem} fs file system
	 * @param {ContextModuleOptions} options options
	 * @param {ResolveDependenciesCallback} callback callback function
	 * @returns {void}
	 */
	resolveDependencies(fs, options, callback) {
		const cmf = this;
		const {
			resource,
			resourceQuery,
			resourceFragment,
			recursive,
			regExp,
			include,
			exclude,
			referencedExports,
			category
		} = options;
		if (!regExp || !resource) return callback(null, []);

		const addDirectoryChecked = (directory, visited, callback) => {
			fs.realpath(directory, (err, realPath) => {
				if (err) return callback(err);
				if (visited.has(realPath)) return callback(null, []);
				let recursionStack;
				addDirectory(
					directory,
					(dir, callback) => {
						if (recursionStack === undefined) {
							recursionStack = new Set(visited);
							recursionStack.add(realPath);
						}
						addDirectoryChecked(dir, recursionStack, callback);
					},
					callback
				);
			});
		};

		const addDirectory = (directory, addSubDirectory, callback) => {
			fs.readdir(directory, (err, files) => {
				if (err) return callback(err);
				const processedFiles = cmf.hooks.contextModuleFiles.call(
					/** @type {string[]} */ (files).map(file => file.normalize("NFC"))
				);
				if (!processedFiles || processedFiles.length === 0)
					return callback(null, []);
				asyncLib.map(
					processedFiles.filter(p => p.indexOf(".") !== 0),
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
									addSubDirectory(subResource, callback);
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

									this.hooks.alternativeRequests.callAsync(
										[obj],
										options,
										(err, alternatives) => {
											if (err) return callback(err);
											alternatives = alternatives
												.filter(obj => regExp.test(obj.request))
												.map(obj => {
													const dep = new ContextElementDependency(
														obj.request + resourceQuery + resourceFragment,
														obj.request,
														category,
														referencedExports
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

		if (typeof fs.realpath === "function") {
			addDirectoryChecked(resource, new Set(), callback);
		} else {
			const addSubDirectory = (dir, callback) =>
				addDirectory(dir, addSubDirectory, callback);
			addDirectory(resource, addSubDirectory, callback);
		}
	}
};
