/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ImportDependency = require("./ImportDependency");
var ImportContextDependency = require("./ImportContextDependency");
var ImportParserPlugin = require("./ImportParserPlugin");

function ImportPlugin(options) {
	this.options = options;
}
module.exports = ImportPlugin;

ImportPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(ImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ImportDependency, new ImportDependency.Template());

		compilation.dependencyFactories.set(ImportContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(ImportContextDependency, new ImportContextDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.import !== "undefined" && !parserOptions.import)
				return;

			parser.apply(
				new ImportParserPlugin(options)
			);
		});
	});
};
