/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ModuleParserHelpers = require("./ModuleParserHelpers");

function ConsolePlugin() {
}
module.exports = ConsolePlugin;
ConsolePlugin.prototype.apply = function(compiler) {
	function ignore() { return true; }
	compiler.parser.plugin("expression console", function(expr) {
		return ModuleParserHelpers.addParsedVariable(this, "console", "require(" + JSON.stringify(path.join(__dirname, "..", "buildin", "console.js")) + ")");
	});
};