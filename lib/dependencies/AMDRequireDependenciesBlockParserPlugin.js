/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
var UnsupportedDependency = require("./UnsupportedDependency");
var LocalModuleDependency = require("./LocalModuleDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");
var LocalModulesHelpers = require("./LocalModulesHelpers");
var ConstDependency = require("./ConstDependency");
var getFunctionExpression = require("./getFunctionExpression");
var UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

function AMDRequireDependenciesBlockParserPlugin(options) {
	this.options = options;
}

module.exports = AMDRequireDependenciesBlockParserPlugin;

function processFunctionArgument(parser, expression) {
	var bindThis = true;
	var fnData = getFunctionExpression(expression);
	if(fnData) {
		parser.inScope(fnData.fn.params.filter(function(i) {
			return ["require", "module", "exports"].indexOf(i.name) < 0;
		}), function() {
			if(fnData.fn.body.type === "BlockStatement")
				parser.walkStatement(fnData.fn.body);
			else
				parser.walkExpression(fnData.fn.body);
		});
		parser.walkExpressions(fnData.expressions);
		if(fnData.needThis === false) {
			bindThis = false;
		}
	} else {
		parser.walkExpression(expression);
	}
	return bindThis;
}

AMDRequireDependenciesBlockParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call require", function(expr) {
		var param;
		var dep;
		var old;
		var result;

		old = this.state.current;

		if(expr.arguments.length >= 1) {
			param = this.evaluateExpression(expr.arguments[0]);
			dep = new AMDRequireDependenciesBlock(
				expr,
				param.range,
				(expr.arguments.length > 1) ? expr.arguments[1].range : null,
				(expr.arguments.length > 2) ? expr.arguments[2].range : null,
				this.state.module,
				expr.loc
			);
			this.state.current = dep;
		}

		if(expr.arguments.length === 1) {
			this.inScope([], function() {
				result = this.applyPluginsBailResult("call require:amd:array", expr, param);
			}.bind(this));
			this.state.current = old;
			if(!result) return;
			this.state.current.addBlock(dep);
			return true;
		}

		if(expr.arguments.length === 2 || expr.arguments.length === 3) {
			try {
				this.inScope([], function() {
					result = this.applyPluginsBailResult("call require:amd:array", expr, param);
				}.bind(this));
				if(!result) {
					dep = new UnsupportedDependency("unsupported", expr.range);
					old.addDependency(dep);
					if(this.state.module)
						this.state.module.errors.push(new UnsupportedFeatureWarning(this.state.module, "Cannot statically analyse 'require(..., ...)' in line " + expr.loc.start.line));
					dep = null;
					return true;
				}
				dep.functionBindThis = processFunctionArgument(this, expr.arguments[1]);
				if(expr.arguments.length === 3) {
					dep.errorCallbackBindThis = processFunctionArgument(this, expr.arguments[2]);
				}
			} finally {
				this.state.current = old;
				if(dep)
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
				} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, request)) { // eslint-disable-line no-cond-assign
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
			} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, param.string)) { // eslint-disable-line no-cond-assign
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
