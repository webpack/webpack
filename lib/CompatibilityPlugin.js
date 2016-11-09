/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ConstDependency = require("./dependencies/ConstDependency");

var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");

var NullFactory = require("./NullFactory");

function CompatibilityPlugin() {}
module.exports = CompatibilityPlugin;

CompatibilityPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	compiler.resolvers.normal.apply(
		new ModuleAliasPlugin({
			"enhanced-require": path.join(__dirname, "..", "buildin", "return-require.js")
		})
	);
	compiler.parser.plugin("call require", function(expr) {
		// support for browserify style require delegator: "require(o, !0)"
		if(expr.arguments.length !== 2) return;
		var second = this.evaluateExpression(expr.arguments[1]);
		if(!second.isBoolean()) return;
		if(second.asBool() !== true) return;
		var dep = new ConstDependency("require", expr.callee.range);
		dep.loc = expr.loc;
		if(this.state.current.dependencies.length > 1) {
			var last = this.state.current.dependencies[this.state.current.dependencies.length - 1];
			if(last.critical && last.request === "." && last.userRequest === "." && last.recursive)
				this.state.current.dependencies.pop();
		}
		dep.critical = "This seems to be a pre-built javascript file. Though this is possible, it's not recommended. Try to require the original source to get better results.";
		this.state.current.addDependency(dep);
		return true;
	});
};
