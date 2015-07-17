/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function RequireJsStuffPlugin() {}
module.exports = RequireJsStuffPlugin;
RequireJsStuffPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});

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
		var dep = new ConstDependency(JSON.stringify("__webpack_require__.oe"), expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
};
