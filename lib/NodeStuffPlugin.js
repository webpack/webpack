/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var ModuleParserHelpers = require("./ModuleParserHelpers");
var ConstDependency = require("./dependencies/ConstDependency");

function NodeStuffPlugin() {
}
module.exports = NodeStuffPlugin;
NodeStuffPlugin.prototype.apply = function(compiler) {
	function ignore() { return true; }
	compiler.parser.plugin("expression __filename", function(expr) {
		this.state.current.addVariable("__filename", JSON.stringify("/index.js"));
		return true;
	});
	compiler.parser.plugin("expression __dirname", function(expr) {
		this.state.current.addVariable("__dirname", JSON.stringify("/"));
		return true;
	});
	compiler.parser.plugin("expression require.main", function(expr) {
		var dep = new ConstDependency("require.cache[0]", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression module.exports", ignore);
	compiler.parser.plugin("expression module.loaded", ignore);
	compiler.parser.plugin("expression module.id", ignore);
	compiler.parser.plugin("expression module", function(expr) {
		return ModuleParserHelpers.addParsedVariable(this, "module", "require(" + JSON.stringify(path.join(__dirname, "..", "buildin", "module.js")) + ")(module)");
	});
};