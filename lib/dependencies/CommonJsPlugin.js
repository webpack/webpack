/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var CommonJsRequireDependency = require("./CommonJsRequireDependency");
var CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
var RequireResolveDependency = require("./RequireResolveDependency");
var RequireResolveContextDependency = require("./RequireResolveContextDependency");
var RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");

var NullFactory = require("../NullFactory");

var RequireResolveDependencyParserPlugin = require("./RequireResolveDependencyParserPlugin");
var CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");

var BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

function CommonJsPlugin() {
}
module.exports = CommonJsPlugin;

CommonJsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(CommonJsRequireDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(CommonJsRequireDependency, new CommonJsRequireDependency.Template());

		compilation.dependencyFactories.set(CommonJsRequireContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(CommonJsRequireContextDependency, new CommonJsRequireContextDependency.Template());

		compilation.dependencyFactories.set(RequireResolveDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireResolveDependency, new RequireResolveDependency.Template());

		compilation.dependencyFactories.set(RequireResolveContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(RequireResolveContextDependency, new RequireResolveContextDependency.Template());

		compilation.dependencyFactories.set(RequireResolveHeaderDependency, new NullFactory());
		compilation.dependencyTemplates.set(RequireResolveHeaderDependency, new RequireResolveHeaderDependency.Template());
	});
	compiler.parser.plugin("evaluate typeof require", function(expr) {
		return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
	});
	compiler.parser.plugin("evaluate typeof module", function(expr) {
		return new BasicEvaluatedExpression().setString("object").setRange(expr.range);
	});
	compiler.parser.plugin("evaluate typeof exports", function(expr) {
		return new BasicEvaluatedExpression().setString("object").setRange(expr.range);
	});
	compiler.parser.apply(
		new CommonJsRequireDependencyParserPlugin(),
		new RequireResolveDependencyParserPlugin()
	);
};