/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");
var path = require("path");

var Tapable = require("tapable");
var ContextModule = require("./ContextModule");
var ContextElementDependency = require("./dependencies/ContextElementDependency");

function ContextModuleFactory(resolvers) {
	Tapable.call(this);
	this.resolvers = resolvers;
}
module.exports = ContextModuleFactory;

ContextModuleFactory.prototype = Object.create(Tapable.prototype);
ContextModuleFactory.prototype.create = function(context, dependency, callback) {
	this.applyPluginsAsyncWaterfall("before-resolve", {
		context: context,
		request: dependency.request,
		recursive: dependency.recursive,
		regExp: dependency.regExp
	}, function(err, result) {
		if(err) return callback(err);

		// Ignored
		if(!result) return callback();

		var context = result.context;
		var request = result.request;
		var recursive = result.recursive;
		var regExp = result.regExp;

		var loaders, resource, loadersPrefix = "";
		var idx = request.lastIndexOf("!");
		if(idx >= 0) {
			loaders = request.substr(0, idx + 1);
			for(var i = 0; i < loaders.length && loaders[i] === "!"; i++) {
				loadersPrefix += "!";
			}
			loaders = loaders.substr(i).replace(/!+$/, "").replace(/!!+/g, "!");
			if(loaders === "") loaders = [];
			else loaders = loaders.split("!");
			resource = request.substr(idx + 1);
		} else {
			loaders = [];
			resource = request;
		}

		async.parallel([
			this.resolvers.context.resolve.bind(this.resolvers.context, context, resource),
			async.map.bind(async, loaders, this.resolvers.loader.resolve.bind(this.resolvers.loader, context))
		], function(err, result) {
			if(err) return callback(err);

			this.applyPluginsAsyncWaterfall("after-resolve", {
				loaders: loadersPrefix + result[1].join("!") + (result[1].length > 0 ? "!" : ""),
				resource: result[0],
				recursive: recursive,
				regExp: regExp
			}, function(err, result) {
				if(err) return callback(err);

				// Ignored
				if(!result) return callback();

				return callback(null, new ContextModule(this.resolveDependencies.bind(this), result.resource, result.recursive, result.regExp, result.loaders));
			}.bind(this));
		}.bind(this));
	}.bind(this));
};

ContextModuleFactory.prototype.resolveDependencies = function resolveDependencies(fs, resource, recursive, regExp, callback) {
	(function addDirectory(directory, callback) {
		fs.readdir(directory, function(err, files) {
			if(err) return callback(err);
			if(!files || files.length === 0) return callback(null, []);
			async.map(files.filter(function(p) {
				return p.indexOf(".") !== 0;
			}), function(seqment, callback) {

				var subResource = path.join(directory, seqment);

				fs.stat(subResource, function(err, stat) {
					if(err) return callback(err);

					if(stat.isDirectory()) {

						if(!recursive) return callback();
						addDirectory.call(this, subResource, callback);

					} else if(stat.isFile()) {

						var obj = {
							context: resource,
							request: "." + subResource.substr(resource.length).replace(/\\/g, "/")
						};
						this.applyPluginsAsyncWaterfall("alternatives", [obj], function(err, alternatives) {
							if(err) return callback(err);
							alternatives = alternatives.filter(function(obj) {
								return regExp.test(obj.request);
							}).map(function(obj) {
								var dep = new ContextElementDependency(obj.request);
								dep.optional = true;
								return dep;
							});
							callback(null, alternatives);
						});

					} else callback();

				}.bind(this));

			}.bind(this), function(err, result) {
				if(err) return callback(err);

				if(!result) return callback(null, []);

				callback(null, result.filter(function(i) { return !!i; }).reduce(function(a, i) {
					return a.concat(i);
				}, []));
			});
		}.bind(this));
	}.call(this, resource, callback));
};
