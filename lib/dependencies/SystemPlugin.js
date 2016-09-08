/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SystemImportDependency = require("./SystemImportDependency");
var SystemImportContextDependency = require("./SystemImportContextDependency");

var UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
var ConstDependency = require("./ConstDependency");
var BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

var SystemImportParserPlugin = require("./SystemImportParserPlugin");

function SystemPlugin(options) {
	this.options = options;
}
module.exports = SystemPlugin;

SystemPlugin.prototype.apply = function(compiler) {
	function setTypeof(expr, value) {
		compiler.parser.plugin("evaluate typeof " + expr, function(expr) {
			return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
		});
		compiler.parser.plugin("typeof " + expr, function(expr) {
			var dep = new ConstDependency(JSON.stringify(value), expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}

	function setNotSupported(name) {
		compiler.parser.plugin("evaluate typeof " + name, function(expr) {
			return new BasicEvaluatedExpression().setString("undefined").setRange(expr.range);
		});
		compiler.parser.plugin("expression " + name, function(expr) {
			var dep = new ConstDependency("(void 0)", expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			if(!this.state.module) return;
			this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, name + " is not supported by webpack."));
			return true;
		});
	}
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(SystemImportDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(SystemImportDependency, new SystemImportDependency.Template());

		compilation.dependencyFactories.set(SystemImportContextDependency, contextModuleFactory);
		compilation.dependencyTemplates.set(SystemImportContextDependency, new SystemImportContextDependency.Template());
	});
	setTypeof("System", "object");
	setTypeof("System.import", "function");
	setNotSupported("System.set");
	setNotSupported("System.get");
	setNotSupported("System.register");
	compiler.parser.plugin("expression System", function(expr) {
		var dep = new ConstDependency("{}", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.apply(
		new SystemImportParserPlugin(this.options)
	);
};
