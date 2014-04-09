/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalModule = require("./ExternalModule");

function ExternalModuleFactoryDecorator(factory, type, externals) {
	this.factory = factory;
	this.type = type;
	this.externals = externals;
}
module.exports = ExternalModuleFactoryDecorator;

ExternalModuleFactoryDecorator.prototype.plugin = function() {
	return this.factory.plugin.apply(this.factory, arguments);
};

ExternalModuleFactoryDecorator.prototype.create = function(context, dependency, callback) {
	var factory = this.factory;
	var globalType = this.type;
	function handleExternal(value, type, callback) {
		if(typeof type === "function") {
			callback = type;
			type = undefined;
		}
		if(value === false) return factory.create(context, dependency, callback);
		if(value === true) value = dependency.request;
		if(typeof type === "undefined" && /^[a-z0-9]+ /.test(value)) {
			var idx = value.indexOf(" ");
			type = value.substr(0, idx);
			value = value.substr(idx+1);
		}
		callback(null, new ExternalModule(value, type || globalType));
		return true;
	}
	(function handleExternals(externals, callback) {
		if(typeof externals === "string") {
			if(externals === dependency.request) {
				return handleExternal(dependency.request, callback);
			}
		} else if(Array.isArray(externals)) {
			var i = 0;
			(function next() {
				do {
					var async = true;
					if(i >= externals.length) return callback();
					handleExternals(externals[i++], function(err, module) {
						if(err) return callback(err);
						if(!module) {
							if(async) return async = false;;
							return next();
						}
						callback(null, module);
					});
				} while(!async);
				async = false;
			}());
			return;
		} else if(externals instanceof RegExp) {
			if(externals.test(dependency.request)) {
				return handleExternal(dependency.request, callback);
			}
		} else if(typeof externals === "function") {
			externals.call(null, context, dependency.request, function(err, value, type) {
				if(err) return callback(err);
				if(typeof value !== "undefined") {
					handleExternal(value, type, callback);
				} else {
					callback();
				}
			});
			return;
		} else if(typeof externals === "object" && Object.prototype.hasOwnProperty.call(externals, dependency.request)) {
			return handleExternal(externals[dependency.request], callback);
		}
		callback();
	}(this.externals, function(err, module) {
		if(err) return callback(err);
		if(!module) return handleExternal(false, callback);
		return callback(null, module);
	}));
};
