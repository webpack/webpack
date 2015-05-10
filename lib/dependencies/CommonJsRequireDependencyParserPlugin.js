/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./ConstDependency");
var CommonJsRequireDependency = require("./CommonJsRequireDependency");
var CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
var RequireHeaderDependency = require("./RequireHeaderDependency");
var LocalModuleDependency = require("./LocalModuleDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");
var LocalModulesHelpers = require("./LocalModulesHelpers");

function CommonJsRequireDependencyParserPlugin(options) {
	this.options = options;
}

module.exports = CommonJsRequireDependencyParserPlugin;

CommonJsRequireDependencyParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("expression require.cache", function(expr) {
		var dep = new ConstDependency("__webpack_require__.c", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	parser.plugin("expression require", function(expr) {
		var dep = new CommonJsRequireContextDependency(options.unknownContextRequest, options.unknownContextRecursive, options.unknownContextRegExp, expr.range);
		dep.critical = options.unknownContextCritical && "require function is used in a way, in which dependencies cannot be statically extracted";
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	});
	parser.plugin("call require", function(expr) {
		if(expr.arguments.length !== 1) return;
		var localModule, dep;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(param.isConditional()) {
			var isExpression = false;
			var prevLength = this.state.current.dependencies.length;
			dep = new RequireHeaderDependency(expr.callee.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
				if(result === undefined) {
					isExpression = true;
				}
			}, this);
			if(isExpression) {
				this.state.current.dependencies.length = prevLength;
			} else {
				return true;
			}
		}
		if(param.isString() && (localModule = LocalModulesHelpers.getLocalModule(this.state, param.string))) {
			dep = new LocalModuleDependency(localModule, expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		} else {
			var result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
			if(result === undefined) {
				this.applyPluginsBailResult("call require:commonjs:context", expr, param);
			} else {
				dep = new RequireHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
			}
			return true;
		}
	});
	parser.plugin("call require:commonjs:item", function(expr, param) {
		if(param.isString()) {
			var dep = new CommonJsRequireDependency(param.string, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
	parser.plugin("call require:commonjs:context", function(expr, param) {
		var dep = ContextDependencyHelpers.create(CommonJsRequireContextDependency, expr.range, param, expr, options);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	});
};

