/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var AMDRequireDependency = require("./AMDRequireDependency");
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var AMDDefineDependency = require("./AMDDefineDependency");
var LocalModuleDependency = require("./LocalModuleDependency");
var ConstDependency = require("./ConstDependency");

var NullFactory = require("../NullFactory");

var AMDRequireDependenciesBlockParserPlugin = require("./AMDRequireDependenciesBlockParserPlugin");
var AMDDefineDependencyParserPlugin = require("./AMDDefineDependencyParserPlugin");

var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");

var BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

function AMDPlugin(options, amdOptions) {
	this.amdOptions = amdOptions;
	this.options = options;
}
module.exports = AMDPlugin;

AMDPlugin.prototype.apply = function(compiler) {
	var amdOptions = this.amdOptions;
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

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

		compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
		compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());
	});
	compiler.parser.apply(
		new AMDRequireDependenciesBlockParserPlugin(this.options),
		new AMDDefineDependencyParserPlugin(this.options)
	);
	compiler.parser.plugin("expression require.amd", function(expr) {
		var dep = new AMDRequireItemDependency("!!webpack amd options", expr.range);
		dep.userRequest = "require.amd";
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression define.amd", function(expr) {
		var dep = new AMDRequireItemDependency("!!webpack amd options", expr.range);
		dep.userRequest = "define.amd";
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression define", function(expr) {
		var dep = new AMDRequireItemDependency("!!webpack amd define", expr.range);
		dep.userRequest = "define";
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression __webpack_amd_options__", function(expr) {
		return this.state.current.addVariable("__webpack_amd_options__", JSON.stringify(amdOptions));
	});
	compiler.parser.plugin("evaluate typeof define.amd", function(expr) {
		return new BasicEvaluatedExpression().setString(typeof amdOptions).setRange(expr.range);
	});
	compiler.parser.plugin("evaluate typeof require.amd", function(expr) {
		return new BasicEvaluatedExpression().setString(typeof amdOptions).setRange(expr.range);
	});
	compiler.parser.plugin("evaluate Identifier define.amd", function(expr) {
		return new BasicEvaluatedExpression().setBoolean(true).setRange(expr.range);
	});
	compiler.parser.plugin("evaluate Identifier require.amd", function(expr) {
		return new BasicEvaluatedExpression().setBoolean(true).setRange(expr.range);
	});
	compiler.parser.plugin("evaluate typeof define", function(expr) {
		return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
	});
	compiler.parser.plugin("typeof define", function(expr) {
		var dep = new ConstDependency("'function'", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("rename define", function(expr) {
		var dep = new AMDRequireItemDependency("!!webpack amd define", expr.range);
		dep.userRequest = "define";
		this.state.current.addDependency(dep);
		return false;
	});	
	compiler.parser.plugin("evaluate typeof require", function(expr) {
		return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
	});
	compiler.parser.plugin("typeof require", function(expr) {
		var dep = new ConstDependency("'function'", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.resolvers.normal.apply(
		new ModuleAliasPlugin({
			"amdefine": path.join(__dirname, "..", "..", "buildin", "amd-define.js"),
			"webpack amd options": path.join(__dirname, "..", "..", "buildin", "amd-options.js"),
			"webpack amd define": path.join(__dirname, "..", "..", "buildin", "amd-define.js")
		})
	);
};