"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConstDependency = require("./ConstDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const RequireResolveDependency = require("./RequireResolveDependency");
const RequireResolveContextDependency = require("./RequireResolveContextDependency");
const RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const NullFactory = require("../NullFactory");
const RequireResolveDependencyParserPlugin = require("./RequireResolveDependencyParserPlugin");
const CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");
class CommonJsPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			const contextModuleFactory = params.contextModuleFactory;
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
				if(typeof parserOptions.commonjs !== "undefined" && !parserOptions.commonjs) {
					return;
				}
				function setTypeof(expr, value) {
					parser.plugin(`evaluate typeof ${expr}`, (expr) => new BasicEvaluatedExpression().setString(value)
						.setRange(expr.range));
					parser.plugin(`typeof ${expr}`, function(expr) {
						const dep = new ConstDependency(JSON.stringify(value), expr.range);
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
						return true;
					});
				}

				setTypeof("require", "function");
				setTypeof("require.resolve", "function");
				setTypeof("require.resolveWeak", "function");
				parser.plugin("evaluate typeof module",
					expr => new BasicEvaluatedExpression().setString("object").setRange(expr.range));
				parser.plugin("assign require", function(expr) {
					// to not leak to global "require", we need to define a local require here.
					const dep = new ConstDependency("var require;", 0);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					this.scope.definitions.push("require");
					return true;
				});
				parser.plugin("can-rename require", () => true);
				parser.plugin("rename require", function(expr) {
					// define the require variable. It's still undefined, but not "not defined".
					const dep = new ConstDependency("var require;", 0);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return false;
				});
				parser.plugin("typeof module", () => true);
				parser.plugin("evaluate typeof exports",
					expr => new BasicEvaluatedExpression().setString("object").setRange(expr.range));
				parser.apply(new CommonJsRequireDependencyParserPlugin(options), new RequireResolveDependencyParserPlugin(options));
			});
		});
	}
}
module.exports = CommonJsPlugin;
