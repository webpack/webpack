/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

const asyncLib = require("async");
const Tapable = require("tapable");
const NormalModule = require("./NormalModule");
const RawModule = require("./RawModule");
const Parser = require("./Parser");
const RuleSet = require("./RuleSet");

function loaderToIdent(data) {
	if(!data.options)
		return data.loader;
	if(typeof data.options === "string")
		return data.loader + "?" + data.options;
	if(typeof data.options !== "object")
		throw new Error("loader options must be string or object");
	if(data.ident)
		return data.loader + "??" + data.ident;
	return data.loader + "?" + JSON.stringify(data.options);
}

function identToLoaderRequest(resultString) {
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
}

class NormalModuleFactory extends Tapable {
	constructor(context, resolvers, options) {
		super();
		this.resolvers = resolvers;
		this.ruleSet = new RuleSet(options.rules || options.loaders);
		this.cachePredicate = typeof options.unsafeCache === "function" ? options.unsafeCache : Boolean.bind(null, options.unsafeCache);
		this.context = context || "";
		this.parserCache = {};
		this.plugin("factory", () => (result, callback) => {
			let resolver = this.applyPluginsWaterfall0("resolver", null);

			// Ignored
			if(!resolver) return callback();

			resolver(result, (err, data) => {
				if(err) return callback(err);

				// Ignored
				if(!data) return callback();

				// direct module
				if(typeof data.source === "function")
					return callback(null, data);

				this.applyPluginsAsyncWaterfall("after-resolve", data, (err, result) => {
					if(err) return callback(err);

					// Ignored
					if(!result) return callback();

					let createdModule = this.applyPluginsBailResult("create-module", result);
					if(!createdModule) {

						if(!result.request) {
							return callback(new Error("Empty dependency (no request)"));
						}

						createdModule = new NormalModule(
							result.request,
							result.userRequest,
							result.rawRequest,
							result.loaders,
							result.resource,
							result.parser
						);
					}

					createdModule = this.applyPluginsWaterfall0("module", createdModule);

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

			asyncLib.parallel([
				callback => this.resolveRequestArray(contextInfo, context, elements, this.resolvers.loader, callback),
				callback => {
					if(resource === "" || resource[0] === "?")
						return callback(null, {
							resource
						});

					this.resolvers.normal.resolve(contextInfo, context, resource, (err, resource, resourceResolveData) => {
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
							const ident = item.options.substr(1);
							item.options = this.ruleSet.findOptionsByIdent(ident);
							item.ident = ident;
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
					} else {
						settings[r.type] = r.value;
					}
				});
				asyncLib.parallel([
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPost, this.resolvers.loader),
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoaders, this.resolvers.loader),
					this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPre, this.resolvers.loader)
				], (err, results) => {
					if(err) return callback(err);
					loaders = results[0].concat(loaders, results[1], results[2]);
					process.nextTick(() => {
						callback(null, {
							context: context,
							request: loaders.map(loaderToIdent).concat([resource]).join("!"),
							dependencies: data.dependencies,
							userRequest,
							rawRequest: request,
							loaders,
							resource,
							resourceResolveData,
							parser: this.getParser(settings.parser)
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
		const request = dependencies[0].request;
		const contextInfo = data.contextInfo || {};
		this.applyPluginsAsyncWaterfall("before-resolve", {
			contextInfo,
			context,
			request,
			dependencies
		}, (err, result) => {
			if(err) return callback(err);

			// Ignored
			if(!result) return callback();

			const factory = this.applyPluginsWaterfall0("factory", null);

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

	getParser(parserOptions) {
		let ident = "null";
		if(parserOptions) {
			if(parserOptions.ident)
				ident = parserOptions.ident;
			else
				ident = JSON.stringify(parserOptions);
		}
		const parser = this.parserCache[ident];
		if(parser)
			return parser;
		return this.parserCache[ident] = this.createParser(parserOptions);
	}

	createParser(parserOptions) {
		const parser = new Parser();
		this.applyPlugins2("parser", parser, parserOptions || {});
		return parser;
	}
}

module.exports = NormalModuleFactory;
