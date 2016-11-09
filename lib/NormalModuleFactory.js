/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

var Tapable = require("tapable");
var NormalModule = require("./NormalModule");
var RawModule = require("./RawModule");
var LoadersList = require("webpack-core/lib/LoadersList");

function NormalModuleFactory(context, resolvers, parser, options) {
	Tapable.call(this);
	this.resolvers = resolvers;
	this.parser = parser;
	this.loaders = new LoadersList(options.loaders);
	this.preLoaders = new LoadersList(options.preLoaders);
	this.postLoaders = new LoadersList(options.postLoaders);
	this.context = context || "";
	this.plugin("factory", function() {
		var _this = this;
		return function(result, callback) {
			var resolver = _this.applyPluginsWaterfall("resolver", null);

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
						createdModule = new NormalModule(
							result.request,
							result.userRequest,
							result.rawRequest,
							result.loaders,
							result.resource,
							result.parser
						);
					}

					createdModule = _this.applyPluginsWaterfall("module", createdModule);

					return callback(null, createdModule);
				});
			});
		};
	});
	this.plugin("resolver", function() {
		var _this = this;
		return function(data, callback) {
			var context = data.context;
			var request = data.request;

			var noAutoLoaders = /^-?!/.test(request);
			var noPrePostAutoLoaders = /^!!/.test(request);
			var noPostAutoLoaders = /^-!/.test(request);
			var elements = request.replace(/^-?!+/, "").replace(/!!+/g, "!").split("!");
			var resource = elements.pop();

			async.parallel([
				function(callback) {
					_this.resolveRequestArray(context, elements, _this.resolvers.loader, callback);
				},
				function(callback) {
					if(resource === "" || resource[0] === "?")
						return callback(null, resource);
					_this.resolvers.normal.resolve(context, resource, callback);
				}
			], function(err, results) {
				if(err) return callback(err);
				var loaders = results[0];
				resource = results[1];

				if(resource === false)
					return callback(null,
						new RawModule("/* (ignored) */",
							"ignored " + context + " " + request,
							request + " (ignored)")); // ignored

				var userRequest = loaders.concat([resource]).join("!");

				if(noPrePostAutoLoaders)
					return onDoneResolving();
				if(noAutoLoaders) {
					async.parallel([
						_this.resolveRequestArray.bind(_this, context, noPostAutoLoaders ? [] : _this.postLoaders.match(resource), _this.resolvers.loader),
						_this.resolveRequestArray.bind(_this, context, _this.preLoaders.match(resource), _this.resolvers.loader)
					], function(err, results) {
						if(err) return callback(err);
						loaders = results[0].concat(loaders).concat(results[1]);
						onDoneResolving();
					});
				} else {
					async.parallel([
						_this.resolveRequestArray.bind(_this, context, noPostAutoLoaders ? [] : _this.postLoaders.match(resource), _this.resolvers.loader),
						_this.resolveRequestArray.bind(_this, context, _this.loaders.match(resource), _this.resolvers.loader),
						_this.resolveRequestArray.bind(_this, context, _this.preLoaders.match(resource), _this.resolvers.loader)
					], function(err, results) {
						if(err) return callback(err);
						loaders = results[0].concat(loaders).concat(results[1]).concat(results[2]);
						onDoneResolving();
					});
				}

				function onDoneResolving() {
					callback(null, {
						context: context,
						request: loaders.concat([resource]).join("!"),
						userRequest: userRequest,
						rawRequest: request,
						loaders: loaders,
						resource: resource,
						parser: _this.parser
					});
				}
			});
		};
	});
}
module.exports = NormalModuleFactory;

NormalModuleFactory.prototype = Object.create(Tapable.prototype);
NormalModuleFactory.prototype.constructor = NormalModuleFactory;

NormalModuleFactory.prototype.create = function(context, dependency, callback) {
	var _this = this;
	context = context || this.context;
	var request = dependency.request;
	_this.applyPluginsAsyncWaterfall("before-resolve", {
		context: context,
		request: request,
		dependency: dependency
	}, function(err, result) {
		if(err) return callback(err);

		// Ignored
		if(!result) return callback();

		var factory = _this.applyPluginsWaterfall("factory", null);

		// Ignored
		if(!factory) return callback();

		factory(result, callback);

	});
};

NormalModuleFactory.prototype.resolveRequestArray = function resolveRequestArray(context, array, resolver, callback) {
	if(array.length === 0) return callback(null, []);
	async.map(array, function(item, callback) {
		if(item === "" || item[0] === "?")
			return callback(null, item);
		resolver.resolve(context, item, callback);
	}, callback);
};
