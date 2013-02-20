/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");

module.exports = AbstractPlugin.create({
	"call require": function(expr) {
		switch(expr.arguments.length) {
		case 1:
			if(expr.arguments[0].type == "FunctionExpression") {
				var dep = new AMDRequireDependenciesBlock(expr, param.range, null, expr.arguments[0].range);
				dep.loc = expr.loc;
				var old = this.state.current;
				this.state.current = dep;
				this.inScope([], function() {
					param.items.forEach(function(param) {
						var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
						if(result === undefined) {
							this.applyPluginsBailResult("call require:amd:context", expr, param);
						}
					}, this);
				}.bind(this));
				this.inScope(expr.arguments[0].params.filter(function(i) {
					return ["require", "module", "exports"].indexOf(i.name) < 0;
				}), function() {
					if(expr.arguments[0].body.type === "BlockStatement")
						this.walkStatement(expr.arguments[0].body);
					else
						this.walkExpression(expr.arguments[0].body);
				}.bind(this));
				this.state.current = old;
				this.state.current.addBlock(dep);
				return true;
			}
			var param = this.evaluateExpression(expr.arguments[0]);
			if(param.isArray()) {
				var dep = new AMDRequireDependenciesBlock(expr, param.range);
				dep.loc = expr.loc;
				var old = this.state.current;
				this.state.current = dep;
				this.inScope([], function() {
					param.items.forEach(function(param) {
						var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
						if(result === undefined) {
							this.applyPluginsBailResult("call require:amd:context", expr, param);
						}
					}, this);
				}.bind(this));
				this.state.current = old;
				this.state.current.addBlock(dep);
				return true;
			}
			return;
		case 2:
			var param = this.evaluateExpression(expr.arguments[0]);
			if(!param.isArray()) return;
			if(expr.arguments[1].type !== "FunctionExpression") return;
			var dep = new AMDRequireDependenciesBlock(expr, param.range, expr.arguments[1].range);
			dep.loc = expr.loc;
			var old = this.state.current;
			this.state.current = dep;
			try {
				this.inScope([], function() {
					param.items.forEach(function(param) {
						var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
						if(result === undefined) {
							this.applyPluginsBailResult("call require:amd:context", expr, param);
						}
					}, this);
				}.bind(this));
				this.inScope(expr.arguments[1].params.filter(function(i) {
					return ["require", "module", "exports"].indexOf(i.name) < 0;
				}), function() {
					if(expr.arguments[1].body.type === "BlockStatement")
						this.walkStatement(expr.arguments[1].body);
					else
						this.walkExpression(expr.arguments[1].body);
				}.bind(this));
			} finally {
				this.state.current = old;
				this.state.current.addBlock(dep);
			}
			return true;
		}
	},
	"call require:amd:item": function(expr, param) {
		if(param.isConditional()) {
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call require:amd:context", expr, param);
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
	"call require:amd:context": function(expr, param) {
		var dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	}
});

