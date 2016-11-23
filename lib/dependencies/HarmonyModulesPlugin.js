/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
var HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
var HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
var HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
var HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
var HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
var HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");

var NullFactory = require("../NullFactory");

var HarmonyImportDependencyParserPlugin = require("./HarmonyImportDependencyParserPlugin");
var HarmonyExportDependencyParserPlugin = require("./HarmonyExportDependencyParserPlugin");

function HarmonyModulesPlugin() {}
module.exports = HarmonyModulesPlugin;

HarmonyModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(HarmonyImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(HarmonyImportDependency, new HarmonyImportDependency.Template());

		compilation.dependencyFactories.set(HarmonyImportSpecifierDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyImportSpecifierDependency, new HarmonyImportSpecifierDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportHeaderDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportHeaderDependency, new HarmonyExportHeaderDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportExpressionDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportExpressionDependency, new HarmonyExportExpressionDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportSpecifierDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportSpecifierDependency, new HarmonyExportSpecifierDependency.Template());

		compilation.dependencyFactories.set(HarmonyExportImportedSpecifierDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyExportImportedSpecifierDependency, new HarmonyExportImportedSpecifierDependency.Template());

		compilation.dependencyFactories.set(HarmonyAcceptDependency, new NullFactory());
		compilation.dependencyTemplates.set(HarmonyAcceptDependency, new HarmonyAcceptDependency.Template());

		compilation.dependencyFactories.set(HarmonyAcceptImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(HarmonyAcceptImportDependency, new HarmonyAcceptImportDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.harmony !== "undefined" && !parserOptions.harmony)
				return;

			parser.apply(
				new HarmonyImportDependencyParserPlugin(),
				new HarmonyExportDependencyParserPlugin()
			);
		});
	});
};
