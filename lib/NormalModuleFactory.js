/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

const asyncLib = require("async");
const Tapable = require("tapable").Tapable;
const AsyncSeriesWaterfallHook = require("tapable").AsyncSeriesWaterfallHook;
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;
const SyncBailHook = require("tapable").SyncBailHook;
const SyncHook = require("tapable").SyncHook;
const HookMap = require("tapable").HookMap;
const NormalModule = require("./NormalModule");
const RawModule = require("./RawModule");
const RuleSet = require("./RuleSet");
const cachedMerge = require("./util/cachedMerge");

const EMPTY_RESOLVE_OPTIONS = {};

const loaderToIdent = data => {
	if(!data.options)
		return data.loader;
	if(typeof data.options === "string")
		return data.loader + "?" + data.options;
	if(typeof data.options !== "object")
		throw new Error("loader options must be string or object");
	if(data.ident)
		return data.loader + "??" + data.ident;
	return data.loader + "?" + JSON.stringify(data.options);
};

const identToLoaderRequest = resultString => {
	const idx = resultString.indexOf("?");
	let options;

	if(idx >= 0) {
		options = resultString.substr(idx + 1);
		resultString = resultString.substr(0, idx);

		return {
			loader: resultString,
			options
		};
	} else {
		return {
			loader: resultString
		};
	}
};

class NormalModuleFactory extends Tapable {
	constructor(context, resolverFactory, options) {
		super();
		this.hooks = {
			resolver: new SyncWaterfallHook(["resolver"]),
			factory: new SyncWaterfallHook(["factory"]),
			beforeResolve: new AsyncSeriesWaterfallHook(["data"]),
			afterResolve: new AsyncSeriesWaterfallHook(["data"]),
			createModule: new SyncBailHook(["data"]),
			module: new SyncWaterfallHook(["module", "data"]),
			createParser: new HookMap(() => new SyncBailHook(["parserOptions"])),
			parser: new HookMap(() => new SyncHook(["parser", "parserOptions"])),
		};
		this._pluginCompat.tap("NormalModuleFactory", options => {
			switch(options.name) {
				case "before-resolve":
				case "after-resolve":
					options.async = true;
					break;
				case "parser":
					this.hooks.parser.for("javascript/auto").tap(options.fn.name || "unnamed compat plugin", options.fn);
					return true;
			}
			let match;
			match = /^parser (.+)$/.exec(options.name);
			if(match) {
				this.hooks.parser.for(match[1]).tap(options.fn.name || "unnamed compat plugin", options.fn.bind(this));
				return true;
			}
			match = /^create-parser (.+)$/.exec(options.name);
			if(match) {
				this.hooks.createParser.for(match[1]).tap(options.fn.name || "unnamed compat plugin", options.fn.bind(this));
				return true;
			}
		});
		this.resolverFactory = resolverFactory;
		this.ruleSet = new RuleSet(options.defaultRules.concat(options.rules));
		this.cachePredicate = typeof options.unsafeCache === "function" ? options.unsafeCache : Boolean.bind(null, options.unsafeCache);
		this.context = context || "";
		this.parserCache = {};
		this.plugin("factory", () => (result, callback) => {
			let resolver = this.hooks.resolver.call(null);

			// Ignored
			if(!resolver) return callback();

			resolver(result, (err, data) => {
				if(err) return callback(err);

				// Ignored
				if(!data) return callback();

				// direct module
				if(typeof data.source === "function")
					return callback(null, data);

				this.hooks.afterResolve.callAsync(data, (err, result) => {
					if(err) return callback(err);

					// Ignored
					if(!result) return callback();

					let createdModule = this.hooks.createModule.call(result);
					if(!createdModule) {

						if(!result.request) {
							return callback(new Error("Empty dependency (no request)"));
						}

						createdModule = new NormalModule(
							result.type,
							result.request,
							result.userRequest,
							result.rawRequest,
							result.loaders,
							result.resource,
							result.parser,
							result.resolveOptions
						);
					}

					createdModule = this.hooks.module.call(createdModule, result);

					return callback(null, createdModule);
				});
			});
		});
		this.plugin("resolver", () => (data, callback) => {
			const contextInfo = data.contextInfo;
			const context = data.context;
			const request = data.request;

			const noAutoLoaders = /^-?!/.test(request);
			const noPrePostAutoLoaders = /^!!/.test(request);
			const noPostAutoLoaders = /^-!/.test(request);
			let elements = request.replace(/^-?!+/, "").replace(/!!+/g, "!").split("!");
			let resource = elements.pop();
			elements = elements.map(identToLoaderRequest);

			const loaderResolver = this.getResolver("loader");
			const normalResolver = this.getResolver("normal", data.resolveOptions);

			asyncLib.parallel([
				callback => this.resolveRequestArray(contextInfo, context, elements, loaderResolver, callback),
				callback => {
					if(resource === "" || resource[0] === "?") {
						return callback(null, {
							resource
						});
					}

					normalResolver.resolve(contextInfo, context, resource, (err, resource, resourceResolveData) => {
						if(err) return callback(err);
						callback(null, {
							resourceResolveData,
							resource
						});
					});
				}
			], (err, results) => {
				if(err) return callback(err);
				let loaders = results[0];
				const resourceResolveData = results[1].resourceResolveData;
				resource = results[1].resource;

				// translate option idents
				try {
					loaders.forEach(item => {
						if(typeof item.options === "string" && /^\?/.test(item.options)) {
							item.options = this.ruleSet.findOptionsByIdent(item.options.substr(1));
						}
					});
				} catch(e) {
					return callback(e);
				}

				if(resource === false) {
					// ignored
					return callback(null,
						new RawModule(
							"/* (ignored) */",
							`ignored ${context} ${request}`,
							`${request} (ignored)`
						)
					);
				}

				const userRequest = loaders.map(loaderToIdent).concat([resource]).join("!");

				let resourcePath = resource;
				let resourceQuery = "";
				const queryIndex = resourcePath.indexOf("?");
				if(queryIndex >= 0) {
					resourceQuery = resourcePath.substr(queryIndex);
					resourcePath = resourcePath.substr(0, queryIndex);
				}

				const result = this.ruleSet.exec({
					resource: resourcePath,
					resourceQuery,
					issuer: contextInfo.issuer,
					compiler: contextInfo.compiler
				});
				const settings = {};
				const useLoadersPost = [];
				const useLoaders = [];
				const useLoadersPre = [];
				result.forEach(r => {
					if(r.type === "use") {
						if(r.enforce === "post" && !noPostAutoLoaders && !noPrePostAutoLoaders)
							useLoadersPost.push(r.value);
						else if(r.enforce === "pre" && !noPrePostAutoLoaders)
							useLoadersPre.push(r.value);
						else if(!r.enforce && !noAutoLoaders && !noPrePostAutoLoaders)
							useLoaders.push(r.value);
					} else if(typeof r.value === "object" && r.value !== null && typeof settings[r.type] === "object" && settings[r.type] !== null) {
						settings[r.type] = cachedMerge(settings[r.type], r.value);
					} else {
						settings[r.type] = r.value;
					}
				});
				asyncLib.parallel([
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPost, loaderResolver),
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoaders, loaderResolver),
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPre, loaderResolver)
				], (err, results) => {
					if(err) return callback(err);
					loaders = results[0].concat(loaders, results[1], results[2]);
					process.nextTick(() => {
						const type = settings.type;
						const resolveOptions = settings.resolve;
						callback(null, {
							context: context,
							request: loaders.map(loaderToIdent).concat([resource]).join("!"),
							dependencies: data.dependencies,
							userRequest,
							rawRequest: request,
							loaders,
							resource,
							resourceResolveData,
							settings,
							type,
							parser: this.getParser(type, settings.parser),
							resolveOptions
						});
					});
				});
			});
		});
	}

	create(data, callback) {
		const dependencies = data.dependencies;
		const cacheEntry = dependencies[0].__NormalModuleFactoryCache;
		if(cacheEntry) return callback(null, cacheEntry);
		const context = data.context || this.context;
		const resolveOptions = data.resolveOptions || EMPTY_RESOLVE_OPTIONS;
		const request = dependencies[0].request;
		const contextInfo = data.contextInfo || {};
		this.hooks.beforeResolve.callAsync({
			contextInfo,
			resolveOptions,
			context,
			request,
			dependencies
		}, (err, result) => {
			if(err) return callback(err);

			// Ignored
			if(!result) return callback();

			const factory = this.hooks.factory.call(null);

			// Ignored
			if(!factory) return callback();

			factory(result, (err, module) => {
				if(err) return callback(err);

				if(module && this.cachePredicate(module)) {
					dependencies.forEach(d => d.__NormalModuleFactoryCache = module);
				}

				callback(null, module);
			});
		});
	}

	resolveRequestArray(contextInfo, context, array, resolver, callback) {
		if(array.length === 0) return callback(null, []);
		asyncLib.map(array, (item, callback) => {
			resolver.resolve(contextInfo, context, item.loader, (err, result) => {
				if(err && /^[^/]*$/.test(item.loader) && !/-loader$/.test(item.loader)) {
					return resolver.resolve(contextInfo, context, item.loader + "-loader", err2 => {
						if(!err2) {
							err.message = err.message + "\n" +
								"BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.\n" +
								`                 You need to specify '${item.loader}-loader' instead of '${item.loader}',\n` +
								"                 see https://webpack.js.org/guides/migrating/#automatic-loader-module-name-extension-removed";
						}
						callback(err);
					});
				}
				if(err) return callback(err);

				const optionsOnly = item.options ? {
					options: item.options
				} : undefined;
				return callback(null, Object.assign({}, item, identToLoaderRequest(result), optionsOnly));
			});
		}, callback);
	}

	getParser(type, parserOptions) {
		let ident = type;
		if(parserOptions) {
			if(parserOptions.ident)
				ident = `${type}|${parserOptions.ident}`;
			else
				ident = JSON.stringify([type, parserOptions]);
		}
		const parser = this.parserCache[ident];
		if(parser)
			return parser;
		return this.parserCache[ident] = this.createParser(type, parserOptions);
	}

	createParser(type, parserOptions) {
		parserOptions = parserOptions || {};
		const parser = this.hooks.createParser.for(type).call(parserOptions);
		if(!parser) {
			throw new Error(`No parser registered for ${type}`);
		}
		this.hooks.parser.for(type).call(parser, parserOptions);
		return parser;
	}

	getResolver(type, resolveOptions) {
		return this.resolverFactory.get(type, resolveOptions || EMPTY_RESOLVE_OPTIONS);
	}
}

module.exports = NormalModuleFactory;
