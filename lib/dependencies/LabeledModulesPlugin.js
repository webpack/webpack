/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var LabeledModuleDependency = require("./LabeledModuleDependency");
var LabeledExportsDependency = require("./LabeledExportsDependency");

var NullFactory = require("../NullFactory");

var LabeledModuleDependencyParserPlugin = require("./LabeledModuleDependencyParserPlugin");

function LabeledModulesPlugin() {}
module.exports = LabeledModulesPlugin;

LabeledModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(LabeledModuleDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(LabeledModuleDependency, new LabeledModuleDependency.Template());

		compilation.dependencyFactories.set(LabeledExportsDependency, new NullFactory());
		compilation.dependencyTemplates.set(LabeledExportsDependency, new LabeledExportsDependency.Template());
	});
	compiler.parser.apply(new LabeledModuleDependencyParserPlugin());
};
