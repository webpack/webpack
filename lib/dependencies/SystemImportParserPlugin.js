/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SystemImportContextDependency = require("./SystemImportContextDependency");
var SystemImportDependenciesBlock = require("./SystemImportDependenciesBlock");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");

function SystemImportParserPlugin(options) {
	this.options = options;
}

module.exports = SystemImportParserPlugin;

SystemImportParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call System.import", function(expr) {
		if(expr.arguments.length !== 1)
			throw new Error("Incorrect number of arguments provided to 'System.import(module: string) -> Promise'.");
		var dep;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(param.isString()) {
			var depBlock = new SystemImportDependenciesBlock(param.string, expr.range, this.state.module, expr.loc);
			this.state.current.addBlock(depBlock);
			return true;
		} else {
			dep = ContextDependencyHelpers.create(SystemImportContextDependency, expr.range, param, expr, options);
			if(!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
};
