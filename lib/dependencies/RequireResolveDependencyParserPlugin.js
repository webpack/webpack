/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireResolveDependency = require("./RequireResolveDependency");
var RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");

module.exports = AbstractPlugin.create({
	"call require.resolve": function(expr) {
		if(expr.arguments.length !== 1) return;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(param.isConditional()) {
			param.options.forEach(function(option) {
				var result = this.applyPluginsBailResult("call require.resolve:item", expr, option);
				if(result === undefined) {
					// TODO: context
				}
			}, this);
			this.state.current.addDependency(new RequireResolveHeaderDependency(expr.callee.range));
			return true;
		} else {
			var result = this.applyPluginsBailResult("call require.resolve:item", expr, param);
			if(result === undefined) {
				// TODO: context
			}
			this.state.current.addDependency(new RequireResolveHeaderDependency(expr.callee.range));
			return true;
		}
	},
	"call require.resolve:item": function(expr, param) {
		if(param.isString()) {
			var dep = new RequireResolveDependency(param.string, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	}
});

