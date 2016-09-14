/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
var RequireEnsureDependency = require("./RequireEnsureDependency");
var ConstDependency = require("./ConstDependency");

var NullFactory = require("../NullFactory");

var RequireEnsureDependenciesBlockParserPlugin = require("./RequireEnsureDependenciesBlockParserPlugin");

var BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

function RequireEnsurePlugin() {}
module.exports = RequireEnsurePlugin;

RequireEnsurePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireEnsureItemDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireEnsureItemDependency, new RequireEnsureItemDependency.Template());

		compilation.dependencyFactories.set(RequireEnsureDependency, new NullFactory());
		compilation.dependencyTemplates.set(RequireEnsureDependency, new RequireEnsureDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.requireEnsure !== "undefined" && !parserOptions.requireEnsure)
				return;

			parser.apply(new RequireEnsureDependenciesBlockParserPlugin());
			parser.plugin("evaluate typeof require.ensure", function(expr) {
				return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
			});
			parser.plugin("typeof require.ensure", function(expr) {
				var dep = new ConstDependency("'function'", expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			});
		});
	});
};
