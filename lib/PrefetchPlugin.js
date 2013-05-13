/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var PrefetchDependency = require("./dependencies/PrefetchDependency");

function PrefetchPlugin(context, request) {
	this.context = context;
	this.request = request;
}
module.exports = PrefetchPlugin;
PrefetchPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
	});
	compiler.plugin("make", function(compilation, callback) {
		compilation.prefetch(this.context, new PrefetchDependency(this.request), callback);
	}.bind(this));
};