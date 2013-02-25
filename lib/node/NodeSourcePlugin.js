/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var ModuleParserHelpers = require("../ModuleParserHelpers");
var ConstDependency = require("../dependencies/ConstDependency");
var nodeLibsBrowser = require("node-libs-browser");

function NodeSourcePlugin() {
}
module.exports = NodeSourcePlugin;
NodeSourcePlugin.prototype.apply = function(compiler) {
	function ignore() { return true; }
	compiler.parser.plugin("expression process", function(expr) {
		return ModuleParserHelpers.addParsedVariable(this, "process", "require(" + JSON.stringify(nodeLibsBrowser._process) + ")");
	});
	compiler.parser.plugin("expression global", function(expr) {
		this.state.current.addVariable("global", "this");
		return true;
	});
	compiler.plugin("after-resolvers", function(compiler) {
		compiler.resolvers.normal.apply(
			new ModuleAliasPlugin(nodeLibsBrowser)
		);
	});
};