/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const path = require("path");
const {
	AsyncSeriesBailHook,
	SyncWaterfallHook,
	SyncBailHook,
	SyncHook,
	HookMap
} = require("tapable");
const Module = require("./Module");
const ModuleFactory = require("./ModuleFactory");
const NormalModule = require("./NormalModule");
const RawModule = require("./RawModule");
const RuleSet = require("./RuleSet");
const cachedMerge = require("./util/cachedMerge");

/** @typedef {import("./ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./dependencies/ModuleDependency")} ModuleDependency */

/**
 * @typedef {Object} ResolveData
 * @property {ModuleFactoryCreateData["contextInfo"]} contextInfo
 * @property {ModuleFactoryCreateData["resolveOptions"]} resolveOptions
 * @property {string} context
 * @property {string} request
 * @property {ModuleDependency[]} dependencies
 * @property {Object} createData
 * @property {Set<string>} fileDependencies
 * @property {Set<string>} missingDependencies
 * @property {Set<string>} contextDependencies
 */

const EMPTY_RESOLVE_OPTIONS = {};

const MATCH_RESOURCE_REGEX = /^([^!]+)!=!/;

const loaderToIdent = data => {
	if (!data.options) {
		return data.loader;
	}
	if (typeof data.options === "string") {
		return data.loader + "?" + data.options;
	}
	if (typeof data.options !== "object") {
		throw new Error("loader options must be string or object");
	}
	if (data.ident) {
		return data.loader + "??" + data.ident;
	}
	return data.loader + "?" + JSON.stringify(data.options);
};

const identToLoaderRequest = resultString => {
	const idx = resultString.indexOf("?");
	if (idx >= 0) {
		const loader = resultString.substr(0, idx);
		const options = resultString.substr(idx + 1);
		return {
			loader,
			options
		};
	} else {
		return {
			loader: resultString,
			options: undefined
		};
	}
};

// TODO webpack 6 remove
const deprecationChangedHookMessage = name =>
	`NormalModuleFactory.${name} is no longer a waterfall hook, but a bailing hook instead. ` +
	"Do not return the passed object, but modify it instead. " +
	"Returning false will ignore the request and results in no module created.";

const dependencyCache = new WeakMap();

class NormalModuleFactory extends ModuleFactory {
	constructor(context, resolverFactory, options) {
		super();
		this.hooks = Object.freeze({
			/** @type {AsyncSeriesBailHook<ResolveData>} */
			resolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<ResolveData>} */
			factorize: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<ResolveData>} */
			beforeResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<ResolveData>} */
			afterResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {SyncBailHook<ResolveData>} */
			createModule: new SyncBailHook(["resolveData"]),
			/** @type {SyncWaterfallHook<Module, ResolveData["createData"], ResolveData>} */
			module: new SyncWaterfallHook(["module", "createData", "resolveData"]),
			createParser: new HookMap(() => new SyncBailHook(["parserOptions"])),
			parser: new HookMap(() => new SyncHook(["parser", "parserOptions"])),
			createGenerator: new HookMap(
				() => new SyncBailHook(["generatorOptions"])
			),
			generator: new HookMap(
				() => new SyncHook(["generator", "generatorOptions"])
			)
		});
		this.resolverFactory = resolverFactory;
		this.ruleSet = new RuleSet(options.defaultRules.concat(options.rules));
		this.unsafeCache = !!options.unsafeCache;
		this.cachePredicate =
			typeof options.unsafeCache === "function"
				? options.unsafeCache
				: () => true;
		this.context = context || "";
		this.parserCache = Object.create(null);
		this.generatorCache = Object.create(null);
		this.hooks.factorize.tapAsync(
			/** @type {TODO} */ ({
				name: "NormalModuleFactory",
				stage: 100
			}),
			(resolveData, callback) => {
				this.hooks.resolve.callAsync(resolveData, (err, result) => {
					if (err) return callback(err);

					// Ignored
					if (result === false) return callback();

					// direct module
					if (result instanceof Module) return callback(null, result);

					if (typeof result === "object")
						throw new Error(
							deprecationChangedHookMessage("resolve") +
								" Returning a Module object will result in this module used as result."
						);

					this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
						if (err) return callback(err);

						if (typeof result === "object")
							throw new Error(deprecationChangedHookMessage("afterResolve"));

						// Ignored
						if (result === false) return callback();

						const createData = resolveData.createData;

						let createdModule = this.hooks.createModule.call(createData);
						if (!createdModule) {
							if (!resolveData.request) {
								return callback(new Error("Empty dependency (no request)"));
							}

							createdModule = new NormalModule(createData);
						}

						createdModule = this.hooks.module.call(
							createdModule,
							createData,
							resolveData
						);

						return callback(null, createdModule);
					});
				});
			}
		);
		this.hooks.resolve.tapAsync(
			/** @type {TODO} */ ({
				name: "NormalModuleFactory",
				stage: 100
			}),
			(data, callback) => {
				const {
					contextInfo,
					context,
					request,
					resolveOptions,
					fileDependencies,
					missingDependencies,
					contextDependencies
				} = data;

				const loaderResolver = this.getResolver("loader");
				const normalResolver = this.getResolver("normal", resolveOptions);

				/** @type {string} */
				let matchResource = undefined;
				/** @type {string} */
				let requestWithoutMatchResource = request;
				const matchResourceMatch = MATCH_RESOURCE_REGEX.exec(request);
				if (matchResourceMatch) {
					matchResource = matchResourceMatch[1];
					if (/^\.\.?\//.test(matchResource)) {
						matchResource = path.join(context, matchResource);
					}
					requestWithoutMatchResource = request.substr(
						matchResourceMatch[0].length
					);
				}

				const noPreAutoLoaders = requestWithoutMatchResource.startsWith("-!");
				const noAutoLoaders =
					noPreAutoLoaders || requestWithoutMatchResource.startsWith("!");
				const noPrePostAutoLoaders = requestWithoutMatchResource.startsWith(
					"!!"
				);
				const rawElements = requestWithoutMatchResource
					.replace(/^-?!+/, "")
					.replace(/!!+/g, "!")
					.split("!");
				const resource = rawElements.pop();
				const elements = rawElements.map(identToLoaderRequest);

				const resolveContext = {
					fileDependencies,
					missing: missingDependencies,
					missingDependencies,
					contextDependencies
				};

				asyncLib.parallel(
					[
						callback =>
							this.resolveRequestArray(
								contextInfo,
								context,
								elements,
								loaderResolver,
								resolveContext,
								callback
							),
						callback => {
							if (resource === "" || resource[0] === "?") {
								return callback(null, {
									resource
								});
							}

							normalResolver.resolve(
								contextInfo,
								context,
								resource,
								resolveContext,
								(err, resource, resourceResolveData) => {
									if (err) return callback(err);

									// TODO remove this when enhanced-resolve supports fileDependencies
									if (resource) {
										fileDependencies.add(resource);
									}

									callback(null, {
										resourceResolveData,
										resource
									});
								}
							);
						}
					],
					(err, results) => {
						if (err) return callback(err);
						let loaders = results[0];
						const resourceResolveData = results[1].resourceResolveData;
						const resource = results[1].resource;

						// translate option idents
						try {
							for (const item of loaders) {
								if (
									typeof item.options === "string" &&
									item.options[0] === "?"
								) {
									const ident = item.options.substr(1);
									item.options = this.ruleSet.findOptionsByIdent(ident);
									item.ident = ident;
								}
							}
						} catch (e) {
							return callback(e);
						}

						if (resource === false) {
							// ignored
							return callback(
								null,
								new RawModule(
									"/* (ignored) */",
									`ignored|${request}`,
									`${request} (ignored)`
								)
							);
						}

						const userRequest =
							(matchResource !== undefined ? `${matchResource}!=!` : "") +
							loaders
								.map(loaderToIdent)
								.concat([resource])
								.join("!");

						let resourcePath =
							matchResource !== undefined ? matchResource : resource;
						let resourceQuery = "";
						const queryIndex = resourcePath.indexOf("?");
						if (queryIndex >= 0) {
							resourceQuery = resourcePath.substr(queryIndex);
							resourcePath = resourcePath.substr(0, queryIndex);
						}

						const result = this.ruleSet.exec({
							resource: resourcePath,
							realResource:
								matchResource !== undefined
									? resource.replace(/\?.*/, "")
									: resourcePath,
							resourceQuery,
							issuer: contextInfo.issuer,
							compiler: contextInfo.compiler
						});
						const settings = {};
						const useLoadersPost = [];
						const useLoaders = [];
						const useLoadersPre = [];
						for (const r of result) {
							if (r.type === "use") {
								if (r.enforce === "post" && !noPrePostAutoLoaders) {
									useLoadersPost.push(r.value);
								} else if (
									r.enforce === "pre" &&
									!noPreAutoLoaders &&
									!noPrePostAutoLoaders
								) {
									useLoadersPre.push(r.value);
								} else if (
									!r.enforce &&
									!noAutoLoaders &&
									!noPrePostAutoLoaders
								) {
									useLoaders.push(r.value);
								}
							} else if (
								typeof r.value === "object" &&
								r.value !== null &&
								typeof settings[r.type] === "object" &&
								settings[r.type] !== null
							) {
								settings[r.type] = cachedMerge(settings[r.type], r.value);
							} else {
								settings[r.type] = r.value;
							}
						}
						asyncLib.parallel(
							[
								this.resolveRequestArray.bind(
									this,
									contextInfo,
									this.context,
									useLoadersPost,
									loaderResolver,
									resolveContext
								),
								this.resolveRequestArray.bind(
									this,
									contextInfo,
									this.context,
									useLoaders,
									loaderResolver,
									resolveContext
								),
								this.resolveRequestArray.bind(
									this,
									contextInfo,
									this.context,
									useLoadersPre,
									loaderResolver,
									resolveContext
								)
							],
							(err, results) => {
								if (err) {
									return callback(err);
								}
								loaders = results[0].concat(loaders, results[1], results[2]);
								const type = settings.type;
								const resolveOptions = settings.resolve;
								Object.assign(data.createData, {
									request: loaders
										.map(loaderToIdent)
										.concat([resource])
										.join("!"),
									userRequest,
									rawRequest: request,
									loaders,
									resource,
									matchResource,
									resourceResolveData,
									settings,
									type,
									parser: this.getParser(type, settings.parser),
									generator: this.getGenerator(type, settings.generator),
									resolveOptions
								});
								callback();
							}
						);
					}
				);
			}
		);
	}

	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dependencies = /** @type {ModuleDependency[]} */ (data.dependencies);
		if (this.unsafeCache) {
			const cacheEntry = dependencyCache.get(dependencies[0]);
			if (cacheEntry) return callback(null, cacheEntry);
		}
		const context = data.context || this.context;
		const resolveOptions = data.resolveOptions || EMPTY_RESOLVE_OPTIONS;
		const dependency = dependencies[0];
		const request = dependency.request;
		const contextInfo = data.contextInfo;
		const fileDependencies = new Set();
		const missingDependencies = new Set();
		const contextDependencies = new Set();
		/** @type {ResolveData} */
		const resolveData = {
			contextInfo,
			resolveOptions,
			context,
			request,
			dependencies,
			fileDependencies,
			missingDependencies,
			contextDependencies,
			createData: {}
		};
		this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
			if (err) return callback(err);

			// Ignored
			if (result === false) return callback();

			if (typeof result === "object")
				throw new Error(deprecationChangedHookMessage("beforeResolve"));

			this.hooks.factorize.callAsync(resolveData, (err, module) => {
				if (err) return callback(err);

				const factoryResult = {
					module,
					fileDependencies,
					missingDependencies,
					contextDependencies
				};

				if (this.unsafeCache && module && this.cachePredicate(module)) {
					for (const d of dependencies) {
						dependencyCache.set(d, factoryResult);
					}
				}

				callback(null, factoryResult);
			});
		});
	}

	resolveRequestArray(
		contextInfo,
		context,
		array,
		resolver,
		resolveContext,
		callback
	) {
		if (array.length === 0) return callback(null, []);
		asyncLib.map(
			array,
			(item, callback) => {
				resolver.resolve(
					contextInfo,
					context,
					item.loader,
					resolveContext,
					(err, result) => {
						if (
							err &&
							/^[^/]*$/.test(item.loader) &&
							!/-loader$/.test(item.loader)
						) {
							return resolver.resolve(
								contextInfo,
								context,
								item.loader + "-loader",
								{},
								err2 => {
									if (!err2) {
										err.message =
											err.message +
											"\n" +
											"BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.\n" +
											`                 You need to specify '${
												item.loader
											}-loader' instead of '${item.loader}',\n` +
											"                 see https://webpack.js.org/migrate/3/#automatic-loader-module-name-extension-removed";
									}
									callback(err);
								}
							);
						}
						if (err) return callback(err);

						const optionsOnly = item.options
							? {
									options: item.options
							  }
							: undefined;

						const resolved = Object.assign(
							{},
							item,
							identToLoaderRequest(result),
							optionsOnly
						);

						// TODO remove this when enhanced-resolve supports fileDependencies
						if (resolved.loader) {
							resolveContext.fileDependencies.add(resolved.loader);
						}

						return callback(null, resolved);
					}
				);
			},
			callback
		);
	}

	getParser(type, parserOptions) {
		let ident = type;
		if (parserOptions) {
			if (parserOptions.ident) {
				ident = `${type}|${parserOptions.ident}`;
			} else {
				ident = JSON.stringify([type, parserOptions]);
			}
		}
		if (ident in this.parserCache) {
			return this.parserCache[ident];
		}
		return (this.parserCache[ident] = this.createParser(type, parserOptions));
	}

	createParser(type, parserOptions = {}) {
		const parser = this.hooks.createParser.for(type).call(parserOptions);
		if (!parser) {
			throw new Error(`No parser registered for ${type}`);
		}
		this.hooks.parser.for(type).call(parser, parserOptions);
		return parser;
	}

	getGenerator(type, generatorOptions) {
		let ident = type;
		if (generatorOptions) {
			if (generatorOptions.ident) {
				ident = `${type}|${generatorOptions.ident}`;
			} else {
				ident = JSON.stringify([type, generatorOptions]);
			}
		}
		if (ident in this.generatorCache) {
			return this.generatorCache[ident];
		}
		return (this.generatorCache[ident] = this.createGenerator(
			type,
			generatorOptions
		));
	}

	createGenerator(type, generatorOptions = {}) {
		const generator = this.hooks.createGenerator
			.for(type)
			.call(generatorOptions);
		if (!generator) {
			throw new Error(`No generator registered for ${type}`);
		}
		this.hooks.generator.for(type).call(generator, generatorOptions);
		return generator;
	}

	getResolver(type, resolveOptions) {
		return this.resolverFactory.get(
			type,
			resolveOptions || EMPTY_RESOLVE_OPTIONS
		);
	}
}

module.exports = NormalModuleFactory;
