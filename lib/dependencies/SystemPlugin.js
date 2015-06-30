/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SystemImportDependency = require("./SystemImportDependency");
var SystemImportContextDependency = require("./SystemImportContextDependency");

var SystemImportParserPlugin = require("./SystemImportParserPlugin");

function SystemPlugin(options) {
	this.options = options;
}
module.exports = SystemPlugin;

SystemPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(SystemImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(SystemImportDependency, new SystemImportDependency.Template());

		compilation.dependencyFactories.set(SystemImportContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(SystemImportContextDependency, new SystemImportContextDependency.Template());
	});
	compiler.parser.apply(
		new SystemImportParserPlugin(this.options)
	);
};
