/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
var LocalModuleDependency = require("./LocalModuleDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");
var LocalModulesHelpers = require("./LocalModulesHelpers");

function AMDRequireDependenciesBlockParserPlugin(options) {
	this.options = options;
}

module.exports = AMDRequireDependenciesBlockParserPlugin;

AMDRequireDependenciesBlockParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call require", function(expr) {
		switch(expr.arguments.length) {
		case 1:
			var param = this.evaluateExpression(expr.arguments[0]);
			var result;
			var dep = new AMDRequireDependenciesBlock(expr, param.range, null, this.state.module, expr.loc);
			var old = this.state.current;
			this.state.current = dep;
			this.inScope([], function() {
				result = this.applyPluginsBailResult("call require:amd:array", expr, param);
			}.bind(this));
			this.state.current = old;
			if(!result) return;
			this.state.current.addBlock(dep);
			return true;
		case 2:
			var param = this.evaluateExpression(expr.arguments[0]);
			var dep = new AMDRequireDependenciesBlock(expr, param.range, expr.arguments[1].range, this.state.module, expr.loc);
			dep.loc = expr.loc;
			var old = this.state.current;
			this.state.current = dep;
			try {
				var result;
				this.inScope([], function() {
					result = this.applyPluginsBailResult("call require:amd:array", expr, param);
				}.bind(this));
				if(!result) return;
				if(expr.arguments[1].type === "FunctionExpression") {
					this.inScope(expr.arguments[1].params.filter(function(i) {
						return ["require", "module", "exports"].indexOf(i.name) < 0;
					}), function() {
						if(expr.arguments[1].body.type === "BlockStatement")
							this.walkStatement(expr.arguments[1].body);
						else
							this.walkExpression(expr.arguments[1].body);
					}.bind(this));
				}
			} finally {
				this.state.current = old;
				this.state.current.addBlock(dep);
			}
			return true;
		}
	});
	parser.plugin("call require:amd:array", function(expr, param) {
		if(param.isArray()) {
			param.items.forEach(function(param) {
				var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call require:amd:context", expr, param);
				}
			}, this);
			return true;
		} else if(param.isConstArray()) {
			var deps = [];
			param.array.forEach(function(request) {
				var dep, localModule;
				if(request === "require") {
					dep = "__webpack_require__";
				} else if(["exports", "module"].indexOf(request) >= 0) {
					dep = request;
				} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, request)) {
					dep = new LocalModuleDependency(localModule);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
				} else {
					dep = new AMDRequireItemDependency(request);
					dep.loc = expr.loc;
					dep.optional = !!this.scope.inTry;
					this.state.current.addDependency(dep);
				}
				deps.push(dep);
			}, this);
			var dep = new AMDRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
	parser.plugin("call require:amd:item", function(expr, param) {
		if(param.isConditional()) {
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call require:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call require:amd:context", expr, param);
				}
			}, this);
			return true;
		} else if(param.isString()) {
			var dep, localModule;
			if(param.string === "require") {
				dep = new ConstDependency("__webpack_require__", param.string);
			} else if(["exports", "module"].indexOf(param.string) >= 0) {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, param.string)) {
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				dep = new AMDRequireItemDependency(param.string, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
	parser.plugin("call require:amd:context", function(expr, param) {
		var dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	});
};

