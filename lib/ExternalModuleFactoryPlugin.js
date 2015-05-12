/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalModule = require("./ExternalModule");

function ExternalModuleFactoryPlugin(type, externals) {
	this.type = type;
	this.externals = externals;
}
module.exports = ExternalModuleFactoryPlugin;

ExternalModuleFactoryPlugin.prototype.apply = function(normalModuleFactory) {
	var globalType = this.type;
	normalModuleFactory.plugin("factory", function(factory) {
		return function(data, callback) {
			var context = data.context;
			var dependency = data.dependency;
			function handleExternal(value, type, callback) {
				if(typeof type === "function") {
					callback = type;
					type = undefined;
				}
				if(value === false) return factory(data, callback);
				if(value === true) value = dependency.request;
				if(typeof type === "undefined" && /^[a-z0-9]+ /.test(value)) {
					var idx = value.indexOf(" ");
					type = value.substr(0, idx);
					value = value.substr(idx + 1);
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
									if(async) {
										async = false;
										return;
									}
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
		}.bind(this);
	}.bind(this));
};
