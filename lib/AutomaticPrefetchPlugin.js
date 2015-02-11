/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");
var PrefetchDependency = require("./dependencies/PrefetchDependency");
var NormalModule = require("./NormalModule");

function AutomaticPrefetchPlugin() {
}
module.exports = AutomaticPrefetchPlugin;
AutomaticPrefetchPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
	});
	var lastModules = null;
	compiler.plugin("after-compile", function(compilation, callback) {
		lastModules = compilation.modules.filter(function(m) {
			return m instanceof NormalModule;
		}).map(function(m) {
			return {
				context: m.context,
				request: m.request
			};
		});
		callback();
	});
	compiler.plugin("make", function(compilation, callback) {
		if(!lastModules) return callback();
		async.forEach(lastModules, function(m, callback) {
			compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
		}, callback);
	}.bind(this));
};
