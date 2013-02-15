/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireIncludeDependency = require("./RequireIncludeDependency");
var RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");

function RequireIncludePlugin() {
}
module.exports = RequireIncludePlugin;

RequireIncludePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireIncludeDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireIncludeDependency, new RequireIncludeDependency.Template());
	});
	new RequireIncludeDependencyParserPlugin().apply(compiler.parser);
};