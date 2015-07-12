/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireIncludeDependency = require("./RequireIncludeDependency");
var RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");
var ConstDependency = require("./ConstDependency");

var BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

function RequireIncludePlugin() {}
module.exports = RequireIncludePlugin;

RequireIncludePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireIncludeDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireIncludeDependency, new RequireIncludeDependency.Template());
	});
	new RequireIncludeDependencyParserPlugin().apply(compiler.parser);
	compiler.parser.plugin("evaluate typeof require.include", function(expr) {
		return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
	});
	compiler.parser.plugin("typeof require.include", function(expr) {
		var dep = new ConstDependency("'function'", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
};
