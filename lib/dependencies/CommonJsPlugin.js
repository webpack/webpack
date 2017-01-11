/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

var ConstDependency = require("./ConstDependency");
var CommonJsRequireDependency = require("./CommonJsRequireDependency");
var CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
var RequireResolveDependency = require("./RequireResolveDependency");
var RequireResolveContextDependency = require("./RequireResolveContextDependency");
var RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");
var RequireHeaderDependency = require("./RequireHeaderDependency");

var NullFactory = require("../NullFactory");

var RequireResolveDependencyParserPlugin = require("./RequireResolveDependencyParserPlugin");
var CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");

var ParserHelpers = require("../ParserHelpers");

function CommonJsPlugin(options) {
	this.options = options;
}
module.exports = CommonJsPlugin;

CommonJsPlugin.prototype.apply = function(compiler) {
	var options = this.options;
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

		compilation.dependencyFactories.set(RequireHeaderDependency, new NullFactory());
		compilation.dependencyTemplates.set(RequireHeaderDependency, new RequireHeaderDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.commonjs !== "undefined" && !parserOptions.commonjs)
				return;

			const requireExpressions = ["require", "require.resolve", "require.resolveWeak"];
			for(const expression of requireExpressions) {
				parser.plugin(`typeof ${expression}`, ParserHelpers.toConstantDependency("function"));
				parser.plugin(`evaluate typeof ${expression}`, ParserHelpers.evaluateToString("function"));
			}

			parser.plugin("evaluate typeof module", ParserHelpers.evaluateToString("object"));
			parser.plugin("assign require", function(expr) {
				// to not leak to global "require", we need to define a local require here.
				var dep = new ConstDependency("var require;", 0);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				this.scope.definitions.push("require");
				return true;
			});
			parser.plugin("can-rename require", function() {
				return true;
			});
			parser.plugin("rename require", function(expr) {
				// define the require variable. It's still undefined, but not "not defined".
				var dep = new ConstDependency("var require;", 0);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return false;
			});
			parser.plugin("typeof module", function() {
				return true;
			});
			parser.plugin("evaluate typeof exports", ParserHelpers.evaluateToString("object"));
			parser.apply(
				new CommonJsRequireDependencyParserPlugin(options),
				new RequireResolveDependencyParserPlugin(options)
			);
		});
	});

};
