"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
const RequireEnsureDependency = require("./RequireEnsureDependency");
const ConstDependency = require("./ConstDependency");
const NullFactory = require("../NullFactory");
const RequireEnsureDependenciesBlockParserPlugin = require("./RequireEnsureDependenciesBlockParserPlugin");
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");
class RequireEnsurePlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(RequireEnsureItemDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(RequireEnsureItemDependency, new RequireEnsureItemDependency.Template());
			compilation.dependencyFactories.set(RequireEnsureDependency, new NullFactory());
			compilation.dependencyTemplates.set(RequireEnsureDependency, new RequireEnsureDependency.Template());
			params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
				if(typeof parserOptions.requireEnsure !== "undefined" && !parserOptions.requireEnsure) {
					return;
				}
				parser.apply(new RequireEnsureDependenciesBlockParserPlugin());
				parser.plugin("evaluate typeof require.ensure",
					expr => new BasicEvaluatedExpression().setString("function").setRange(expr.range));
				parser.plugin("typeof require.ensure", function(expr) {
					const dep = new ConstDependency("'function'", expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return true;
				});
			});
		});
	}
}
module.exports = RequireEnsurePlugin;
