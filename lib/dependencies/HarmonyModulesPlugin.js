/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
var HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
var HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");

var NullFactory = require("../NullFactory");

var HarmonyImportDependencyParserPlugin = require("./HarmonyImportDependencyParserPlugin");
var HarmonyExportDependencyParserPlugin = require("./HarmonyExportDependencyParserPlugin");

function HarmonyModulesPlugin() {
}
module.exports = HarmonyModulesPlugin;

HarmonyModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(HarmonyImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(HarmonyImportDependency, new HarmonyImportDependency.Template());

		compilation.dependencyFactories.set(HarmonyImportSpecifierDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyImportSpecifierDependency, new HarmonyImportSpecifierDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportExpressionDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportExpressionDependency, new HarmonyExportExpressionDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportSpecifierDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportSpecifierDependency, new HarmonyExportSpecifierDependency.Template());
	});
	compiler.parser.apply(
		new HarmonyImportDependencyParserPlugin(),
		new HarmonyExportDependencyParserPlugin()
	);
};
