/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	Modified by Richard Scarrott @richardscarrott
*/

var AMDRequireErrorHandlerDependency = require("./AMDRequireErrorHandlerDependency");
var NullFactory = require("../NullFactory");
var AMDRequireErrorHandlerDependenciesBlockParserPlugin = require("./AMDRequireErrorHandlerDependenciesBlockParserPlugin");

function AMDErrorHandlerPlugin(options) {
	this.options = options;
}
module.exports = AMDErrorHandlerPlugin;

AMDErrorHandlerPlugin.prototype.apply = function(compiler) {

	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(AMDRequireErrorHandlerDependency, new NullFactory());
		compilation.dependencyTemplates.set(AMDRequireErrorHandlerDependency, new AMDRequireErrorHandlerDependency.Template());
	});

	compiler.parser.apply(
		new AMDRequireErrorHandlerDependenciesBlockParserPlugin(this.options)
	);

};