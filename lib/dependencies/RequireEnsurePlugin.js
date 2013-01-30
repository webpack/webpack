/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
var RequireEnsureDependency = require("./RequireEnsureDependency");

var NullFactory = require("../NullFactory");

var RequireEnsureDependenciesBlockParserPlugin = require("./RequireEnsureDependenciesBlockParserPlugin");

function RequireEnsurePlugin() {
}
module.exports = RequireEnsurePlugin;

RequireEnsurePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireEnsureItemDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireEnsureItemDependency, new RequireEnsureItemDependency.Template());

		compilation.dependencyFactories.set(RequireEnsureDependency, new NullFactory());
		compilation.dependencyTemplates.set(RequireEnsureDependency, new RequireEnsureDependency.Template());
	});
	new RequireEnsureDependenciesBlockParserPlugin().apply(compiler.parser);
};