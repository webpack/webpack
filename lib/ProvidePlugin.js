/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleParserHelpers = require("./ModuleParserHelpers");

function ProvidePlugin(name, request) {
	this.name = name;
	this.request = request;
}
module.exports = ProvidePlugin;
ProvidePlugin.prototype.apply = function(compiler) {
	var name = this.name;
	var request = this.request;
	compiler.parser.plugin("expression " + name, function(expr) {
		return ModuleParserHelpers.addParsedVariable(this, name, "require(" + JSON.stringify(request) + ")");
	});
};