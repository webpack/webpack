/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ConstDependency = require("./dependencies/ConstDependency");

function RequireJsStuffPlugin() {
}
module.exports = RequireJsStuffPlugin;
RequireJsStuffPlugin.prototype.apply = function(compiler) {
	function remove(expr) {
		var dep = new ConstDependency(";", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	}
	compiler.parser.plugin("call require.config", remove);
	compiler.parser.plugin("call requirejs.config", remove);

	compiler.parser.plugin("expression require.version", function(expr) {
		var dep = new ConstDependency(JSON.stringify("0.0.0"), expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression requirejs.onError", function(expr) {
		var dep = new ConstDependency(JSON.stringify("require.onError"), expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
};