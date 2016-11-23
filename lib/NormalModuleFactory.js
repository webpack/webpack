/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");
var objectAssign = require('object-assign');
var Tapable = require("tapable");
var NormalModule = require("./NormalModule");
var RawModule = require("./RawModule");
var Parser = require("./Parser");
var RuleSet = require("./RuleSet");

function loaderToIdent(data) {
	if(!data.options)
		return data.loader;
	if(typeof data.options === "string")
		return data.loader + "?" + data.options;
	if(typeof data.options !== "object")
		throw new Error("loader options must be string or object");
	if(data.options.ident)
		return data.loader + "??" + data.options.ident;
	return data.loader + "?" + JSON.stringify(data.options);
}

function NormalModuleFactory(context, resolvers, options) {
	Tapable.call(this);
	this.resolvers = resolvers;
	this.ruleSet = new RuleSet(options.rules || options.loaders);
	this.context = context || "";
	this.parserCache = {};
	this.plugin("factory", function() {
		var _this = this;
		return function(result, callback) {
			var resolver = _this.applyPluginsWaterfall0("resolver", null);

			// Ignored
			if(!resolver) return callback();

			resolver(result, function onDoneResolving(err, data) {
				if(err) return callback(err);

				// Ignored
				if(!data) return callback();

				// direct module
				if(typeof data.source === "function")
					return callback(null, data);

				_this.applyPluginsAsyncWaterfall("after-resolve", data, function(err, result) {
					if(err) return callback(err);

					// Ignored
					if(!result) return callback();

					var createdModule = _this.applyPluginsBailResult("create-module", result);
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

					createdModule = _this.applyPluginsWaterfall0("module", createdModule);

					return callback(null, createdModule);
				});
			});
		};
	});
	this.plugin("resolver", function() {
		var _this = this;
		return function(data, callback) {
			var contextInfo = data.contextInfo;
			var context = data.context;
			var request = data.request;

			var noAutoLoaders = /^-?!/.test(request);
			var noPrePostAutoLoaders = /^!!/.test(request);
			var noPostAutoLoaders = /^-!/.test(request);
			var elements = request.replace(/^-?!+/, "").replace(/!!+/g, "!").split("!");
			var resource = elements.pop();
			elements = elements.map(function(element) {
				var idx = element.indexOf("?");
				var options;
				if(idx >= 0) {
					options = element.substr(idx + 1);
					element = element.substr(0, idx);
				}
				return {
					loader: element,
					options: options
				};
			});

			async.parallel([
				function(callback) {
					_this.resolveRequestArray(contextInfo, context, elements, _this.resolvers.loader, callback);
				},
				function(callback) {
					if(resource === "" || resource[0] === "?")
						return callback(null, resource);
					_this.resolvers.normal.resolve(contextInfo, context, resource, function(err, result) {
						if(err) return callback(err);
						callback(null, result);
					});
				}
			], function(err, results) {
				if(err) return callback(err);
				var loaders = results[0];
				resource = results[1];

				// translate option idents
				try {
					loaders.forEach(function(item) {
						if(typeof item.options === "string" && /^\?/.test(item.options)) {
							item.options = _this.ruleSet.findOptionsByIdent(item.options.substr(1));
						}
					})
				} catch(e) {
					return callback(e);
				}

				if(resource === false)
					return callback(null,
						new RawModule("/* (ignored) */",
							"ignored " + context + " " + request,
							request + " (ignored)")); // ignored

				var userRequest = loaders.map(loaderToIdent).concat([resource]).join("!");

				var resourcePath = resource;
				var resourceQuery = "";
				var queryIndex = resourcePath.indexOf("?");
				if(queryIndex >= 0) {
					resourceQuery = resourcePath.substr(queryIndex);
					resourcePath = resourcePath.substr(0, queryIndex);
				}

				var result = _this.ruleSet.exec({
					resource: resourcePath,
					resourceQuery: resourceQuery,
					issuer: contextInfo.issuer
				});
				var settings = {};
				var useLoadersPost = [];
				var useLoaders = [];
				var useLoadersPre = [];
				result.forEach(function(r) {
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
				async.parallel([
					_this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoadersPost, _this.resolvers.loader),
					_this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoaders, _this.resolvers.loader),
					_this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoadersPre, _this.resolvers.loader)
				], function(err, results) {
					if(err) return callback(err);
					loaders = results[0].concat(loaders).concat(results[1]).concat(results[2]);
					onDoneResolving();
				});

				function onDoneResolving() {
					callback(null, {
						context: context,
						request: loaders.map(loaderToIdent).concat([resource]).join("!"),
						dependencies: data.dependencies,
						userRequest: userRequest,
						rawRequest: request,
						loaders: loaders,
						resource: resource,
						parser: _this.getParser(settings.parser)
					});
				}
			});
		};
	});
}
module.exports = NormalModuleFactory;

NormalModuleFactory.prototype = Object.create(Tapable.prototype);
NormalModuleFactory.prototype.constructor = NormalModuleFactory;

NormalModuleFactory.prototype.create = function(data, callback) {
	var _this = this;
	var context = data.context || this.context;
	var dependencies = data.dependencies;
	var request = dependencies[0].request;
	var contextInfo = data.contextInfo || {};
	_this.applyPluginsAsyncWaterfall("before-resolve", {
		contextInfo: contextInfo,
		context: context,
		request: request,
		dependencies: dependencies
	}, function(err, result) {
		if(err) return callback(err);

		// Ignored
		if(!result) return callback();

		var factory = _this.applyPluginsWaterfall0("factory", null);

		// Ignored
		if(!factory) return callback();

		factory(result, callback);

	});
};

NormalModuleFactory.prototype.resolveRequestArray = function resolveRequestArray(contextInfo, context, array, resolver, callback) {
	if(array.length === 0) return callback(null, []);
	async.map(array, function(item, callback) {
		resolver.resolve(contextInfo, context, item.loader, function(err, result) {
			if(err && /^[^/]*$/.test(item.loader) && !/-loader$/.test(item.loader)) {
				return resolver.resolve(contextInfo, context, item.loader + "-loader", function(err2) {
					if(!err2) {
						err.message = err.message + "\n" +
							"BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.\n" +
							"                 You need to specify '" + item.loader + "-loader' instead of '" + item.loader + "'.";
					}
					callback(err);
				});
			}
			if(err) return callback(err);
			return callback(null, objectAssign({}, item, {
				loader: result
			}));
		});
	}, callback);
};

NormalModuleFactory.prototype.getParser = function getParser(parserOptions) {
	var ident = "null"
	if(parserOptions) {
		if(parserOptions.ident)
			ident = parserOptions.ident;
		else
			ident = JSON.stringify(parserOptions);
	}
	var parser = this.parserCache[ident];
	if(parser)
		return parser;
	return this.parserCache[ident] = this.createParser(parserOptions);
};

NormalModuleFactory.prototype.createParser = function createParser(parserOptions) {
	var parser = new Parser();
	this.applyPlugins("parser", parser, parserOptions || {});
	return parser;
};
