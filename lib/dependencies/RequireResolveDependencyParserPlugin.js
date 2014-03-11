/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequireResolveDependency = require("./RequireResolveDependency");
var RequireResolveContextDependency = require("./RequireResolveContextDependency");
var RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");

function RequireResolveDependencyParserPlugin(options) {
	this.options = options;
}

module.exports = RequireResolveDependencyParserPlugin;

RequireResolveDependencyParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call require.resolve", function(expr) {
		if(expr.arguments.length !== 1) return;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(param.isConditional()) {
			param.options.forEach(function(option) {
				var result = this.applyPluginsBailResult("call require.resolve:item", expr, option);
				if(result === undefined) {
					this.applyPluginsBailResult("call require.resolve:context", expr, option);
				}
			}, this);
			this.state.current.addDependency(new RequireResolveHeaderDependency(expr.callee.range));
			return true;
		} else {
			var result = this.applyPluginsBailResult("call require.resolve:item", expr, param);
			if(result === undefined) {
				this.applyPluginsBailResult("call require.resolve:context", expr, param);
			}
			this.state.current.addDependency(new RequireResolveHeaderDependency(expr.callee.range));
			return true;
		}
	});
	parser.plugin("call require.resolve:item", function(expr, param) {
		if(param.isString()) {
			var dep = new RequireResolveDependency(param.string, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
	parser.plugin("call require.resolve:context", function(expr, param) {
		var dep = ContextDependencyHelpers.create(RequireResolveContextDependency, param.range, param, expr, options);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	});
};

