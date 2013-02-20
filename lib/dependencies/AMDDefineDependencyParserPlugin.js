/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var ConstDependency = require("./ConstDependency");
var AMDDefineDependency = require("./AMDDefineDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");

module.exports = AbstractPlugin.create({
	"call define": function(expr) {
		var array, fn;
		switch(expr.arguments.length) {
		case 1:
			if(expr.arguments[0].type == "FunctionExpression") {
				fn = expr.arguments[0];
			} else  {
				var dep = new AMDDefineDependency(expr.range, expr.arguments[0].range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			}
			break;
		case 2:
			if(expr.arguments[0].type == "ArrayExpression" && expr.arguments[1].type == "FunctionExpression") {
				array = expr.arguments[0];
				fn = expr.arguments[1];
			} else if(expr.arguments[0].type == "Literal" && expr.arguments[1].type == "FunctionExpression") {
				fn = expr.arguments[1];
			} else if(expr.arguments[0].type == "Literal" && expr.arguments[1].type == "ArrayExpression") {
				array = expr.arguments[1];
			} else if(expr.arguments[0].type == "Literal") {
				var dep = new AMDDefineDependency(expr.range, expr.arguments[1].range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			}
			break;
		case 3:
			if(expr.arguments[0].type == "Literal" && 
				expr.arguments[1].type == "ArrayExpression" && 
				expr.arguments[2].type == "FunctionExpression") {
				array = expr.arguments[1];
				fn = expr.arguments[2];
			}
			break;
		}
		if(!array && !fn) return;
		if(array) {
			var param = this.evaluateExpression(array);
			param.items.forEach(function(param) {
				var result = this.applyPluginsBailResult("call define:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call define:amd:context", expr, param);
				}
			}, this);
		}
		if(fn) {
			var inTry = this.scope.inTry;
			this.inScope(fn.params.filter(function(i) {
				return ["require", "module", "exports"].indexOf(i.name) < 0;
			}), function() {
				this.scope.inTry = inTry;
				if(fn.body.type === "BlockStatement")
					this.walkStatement(fn.body);
				else
					this.walkExpression(fn.body);
			}.bind(this));
		}
		var dep = new AMDDefineDependency(expr.range, array ? array.range : null, fn ? fn.range : null);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"call define:amd:item": function(expr, param) {
		if(param.isConditional()) {
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call define:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call define:amd:context", expr, param);
				}
			}, this);
			return true;
		} else if(param.isString()) {
			var dep;
			if(["require","exports","module"].indexOf(param.string) >= 0) {
				dep = new ConstDependency(param.string, param.range);
			} else {
				dep = new AMDRequireItemDependency(param.string, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	},
	"call define:amd:context": function(expr, param) {
		var dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	}
});

