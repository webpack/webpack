"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const path = require("path");
const AMDRequireDependency = require("./AMDRequireDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDDefineDependency = require("./AMDDefineDependency");
const UnsupportedDependency = require("./UnsupportedDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const ConstDependency = require("./ConstDependency");
const NullFactory = require("../NullFactory");
const AMDRequireDependenciesBlockParserPlugin = require("./AMDRequireDependenciesBlockParserPlugin");
const AMDDefineDependencyParserPlugin = require("./AMDDefineDependencyParserPlugin");
const AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");
class AMDPlugin {
	constructor(options, amdOptions) {
		this.options = options;
		this.amdOptions = amdOptions;
	}

	apply(compiler) {
		const options = this.options;
		const amdOptions = this.amdOptions;
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			const contextModuleFactory = params.contextModuleFactory;
			compilation.dependencyFactories.set(AMDRequireDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDRequireDependency, new AMDRequireDependency.Template());
			compilation.dependencyFactories.set(AMDRequireItemDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(AMDRequireItemDependency, new AMDRequireItemDependency.Template());
			compilation.dependencyFactories.set(AMDRequireArrayDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDRequireArrayDependency, new AMDRequireArrayDependency.Template());
			compilation.dependencyFactories.set(AMDRequireContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(AMDRequireContextDependency, new AMDRequireContextDependency.Template());
			compilation.dependencyFactories.set(AMDDefineDependency, new NullFactory());
			compilation.dependencyTemplates.set(AMDDefineDependency, new AMDDefineDependency.Template());
			compilation.dependencyFactories.set(UnsupportedDependency, new NullFactory());
			compilation.dependencyTemplates.set(UnsupportedDependency, new UnsupportedDependency.Template());
			compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
			compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());
			params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
				if(typeof parserOptions.amd !== "undefined" && !parserOptions.amd) {
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

				function setExpressionToModule(expr, module) {
					parser.plugin(`expression ${expr}`, function(expr) {
						const dep = new AMDRequireItemDependency(module, expr.range);
						// todo: the expr below is refer to expr of setExpressionToModule
						dep.userRequest = expr;
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
						return true;
					});
				}

				parser.apply(new AMDRequireDependenciesBlockParserPlugin(options), new AMDDefineDependencyParserPlugin(options));
				setExpressionToModule("require.amd", "!!webpack amd options");
				setExpressionToModule("define.amd", "!!webpack amd options");
				setExpressionToModule("define", "!!webpack amd define");
				parser.plugin("expression __webpack_amd_options__", function() {
					return this.state.current.addVariable("__webpack_amd_options__", JSON.stringify(amdOptions));
				});
				parser.plugin("evaluate typeof define.amd", (expr) => new BasicEvaluatedExpression().setString(typeof amdOptions)
					.setRange(expr.range));
				parser.plugin("evaluate typeof require.amd", (expr) => new BasicEvaluatedExpression().setString(typeof amdOptions)
					.setRange(expr.range));
				parser.plugin("evaluate Identifier define.amd", (expr) => new BasicEvaluatedExpression().setBoolean(true)
					.setRange(expr.range));
				parser.plugin("evaluate Identifier require.amd", (expr) => new BasicEvaluatedExpression().setBoolean(true)
					.setRange(expr.range));
				setTypeof("define", "function");
				parser.plugin("can-rename define", () => true);
				parser.plugin("rename define", function(expr) {
					const dep = new AMDRequireItemDependency("!!webpack amd define", expr.range);
					dep.userRequest = "define";
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return false;
				});
				setTypeof("require", "function");
			});
		});
		compiler.plugin("after-resolvers", function() {
			compiler.resolvers.normal.apply(new AliasPlugin("described-resolve", {
				name: "amdefine",
				alias: path.join(__dirname, "..", "..", "buildin", "amd-define.js")
			}, "resolve"), new AliasPlugin("described-resolve", {
				name: "webpack amd options",
				alias: path.join(__dirname, "..", "..", "buildin", "amd-options.js")
			}, "resolve"), new AliasPlugin("described-resolve", {
				name: "webpack amd define",
				alias: path.join(__dirname, "..", "..", "buildin", "amd-define.js")
			}, "resolve"));
		});
	}
}
module.exports = AMDPlugin;
