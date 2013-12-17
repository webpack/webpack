/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleParserHelpers = require("./ModuleParserHelpers");

function ProvidePlugin(definitions) {
	this.definitions = definitions;
}
module.exports = ProvidePlugin;
ProvidePlugin.prototype.apply = function(compiler) {
	Object.keys(this.definitions).forEach(function(name) {
		var request = this.definitions[name];
		compiler.parser.plugin("expression " + name, function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, name, "require(" + JSON.stringify(request) + ")");
		});
	}, this);
};