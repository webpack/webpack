/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var ConstDependency = require("./ConstDependency");
var CommonJsRequireDependency = require("./CommonJsRequireDependency");
var CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");

module.exports = AbstractPlugin.create({
	"expression require.cache": function(expr) {
		return true;
	},
	"expression require": function(expr) {
		var dep = new CommonJsRequireContextDependency(".", true, /^\.\/.*$/, expr.range);
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	},
	"call require": function(expr) {
		if(expr.arguments.length !== 1) return;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(param.isConditional()) {
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call require:commonjs:context", expr, param);
				}
			}, this);
			return true;
		} else {
			var result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
			if(result === undefined) {
				this.applyPluginsBailResult("call require:commonjs:context", expr, param);
			}
			return true;
		}
	},
	"call require:commonjs:item": function(expr, param) {
		if(param.isString()) {
			var dep = new CommonJsRequireDependency(param.string, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		} else {
			return this.applyPluginsBailResult("call require:commonjs:context", expr, param);
		}
	},
	"call require:commonjs:context": function(expr, param) {
		var dep = ContextDependencyHelpers.create(CommonJsRequireContextDependency, expr.range, param, expr);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	}
});

