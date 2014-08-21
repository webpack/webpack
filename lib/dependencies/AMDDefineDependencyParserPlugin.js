/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var ConstDependency = require("./ConstDependency");
var AMDDefineDependency = require("./AMDDefineDependency");
var AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
var LocalModuleDependency = require("./LocalModuleDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");
var LocalModulesHelpers = require("./LocalModulesHelpers");

function isBoundFunctionExpression(expr) {
	if(expr.type !== "CallExpression") return false;
	if(expr.callee.type !== "MemberExpression") return false;
	if(expr.callee.computed) return false;
	if(expr.callee.object.type !== "FunctionExpression") return false;
	if(expr.callee.property.type !== "Identifier") return false;
	if(expr.callee.property.name !== "bind") return false;
	return true;
}

function AMDDefineDependencyParserPlugin(options) {
	this.options = options;
}

module.exports = AMDDefineDependencyParserPlugin;
AMDDefineDependencyParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call define", function(expr) {
		var array, fn, obj, namedModule;
		switch(expr.arguments.length) {
		case 1:
			if(expr.arguments[0].type === "FunctionExpression" || isBoundFunctionExpression(expr.arguments[0])) {
				// define(f() {...})
				fn = expr.arguments[0];
			} else if(expr.arguments[0].type === "ObjectExpression") {
				// define({...})
				obj = expr.arguments[0];
			} else {
				// define(expr)
				// unclear if function or object
				obj = fn = expr.arguments[0];
			}
			break;
		case 2:
			if(expr.arguments[0].type === "Literal") {
				namedModule = expr.arguments[0].value;
				// define("...", ...)
				if(expr.arguments[1].type === "FunctionExpression" || isBoundFunctionExpression(expr.arguments[1])) {
					// define("...", f() {...})
					fn = expr.arguments[1];
				} else if(expr.arguments[1].type === "ObjectExpression") {
					// define("...", {...})
					obj = expr.arguments[1];
				} else {
					// define("...", expr)
					// unclear if function or object
					obj = fn = expr.arguments[1];
				}
			} else {
				array = expr.arguments[0];
				if(expr.arguments[1].type === "FunctionExpression" || isBoundFunctionExpression(expr.arguments[1])) {
					// define([...], f() {})
					fn = expr.arguments[1];
				} else  if(expr.arguments[1].type === "ObjectExpression") {
					// define([...], {...})
					obj = expr.arguments[1];
				} else {
					// define([...], expr)
					// unclear if function or object
					obj = fn = expr.arguments[1];
				}
			}
			break;
		case 3:
			// define("...", [...], f() {...})
			namedModule = expr.arguments[0].value;
			array = expr.arguments[1];
			if(expr.arguments[2].type === "FunctionExpression" || isBoundFunctionExpression(expr.arguments[2])) {
				// define("...", [...], f() {})
				fn = expr.arguments[2];
			} else  if(expr.arguments[2].type === "ObjectExpression") {
				// define("...", [...], {...})
				obj = expr.arguments[2];
			} else {
				// define("...", [...], expr)
				// unclear if function or object
				obj = fn = expr.arguments[2];
			}
			break;
		default: return;
		}
		var fnParams = null;
		var fnParamsOffset = 0;
		if(fn) {
			if(fn.type === "FunctionExpression") fnParams = fn.params;
			else if(isBoundFunctionExpression(fn)) {
				fnParams = fn.callee.object.params;
				fnParamsOffset = fn.arguments.length - 1;
				if(fnParamsOffset < 0) fnParamsOffset = 0;
			}
		}
		var fnRenames = Object.create(this.scope.renames);
		if(array) {
			var identifiers = {};
			var param = this.evaluateExpression(array);
			var result = this.applyPluginsBailResult("call define:amd:array", expr, param, identifiers);
			if(!result) return;
			if(fnParams) fnParams = fnParams.slice(fnParamsOffset).filter(function(param, idx) {
				if(identifiers[idx]) {
					fnRenames["$"+param.name] = identifiers[idx];
					return false;
				}
				return true;
			});
		} else {
			var identifiers = ["require", "exports", "module"];
			if(fnParams) fnParams = fnParams.slice(fnParamsOffset).filter(function(param, idx) {
				if(identifiers[idx]) {
					fnRenames["$"+param.name] = identifiers[idx];
					return false;
				}
				return true;
			});
		}
		if(fn && fn.type === "FunctionExpression") {
			var inTry = this.scope.inTry;
			this.inScope(fnParams, function() {
				this.scope.renames = fnRenames;
				this.scope.inTry = inTry;
				if(fn.body.type === "BlockStatement")
					this.walkStatement(fn.body);
				else
					this.walkExpression(fn.body);
			}.bind(this));
		} else if(fn && isBoundFunctionExpression(fn)) {
			var inTry = this.scope.inTry;
			this.inScope(fn.callee.object.params.filter(function(i) {
				return ["require", "module", "exports"].indexOf(i.name) < 0;
			}), function() {
				this.scope.renames = fnRenames;
				this.scope.inTry = inTry;
				if(fn.callee.object.body.type === "BlockStatement")
					this.walkStatement(fn.callee.object.body);
				else
					this.walkExpression(fn.callee.object.body);
			}.bind(this));
			if(fn.arguments)
				this.walkExpressions(fn.arguments);
		} else if(fn || obj) {
			this.walkExpression(fn || obj);
		}
		var dep = new AMDDefineDependency(expr.range, array ? array.range : null, fn ? fn.range : null, obj ? obj.range : null);
		dep.loc = expr.loc;
		if(namedModule) {
			dep.localModule = LocalModulesHelpers.addLocalModule(this.state, namedModule);
		}
		this.state.current.addDependency(dep);
		return true;
	});
	parser.plugin("call define:amd:array", function(expr, param, identifiers) {
		if(param.isArray()) {
			param.items.forEach(function(param, idx) {
				if(param.isString() && ["require", "module", "exports"].indexOf(param.string) >= 0)
					identifiers[idx] = param.string;
				var result = this.applyPluginsBailResult("call define:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call define:amd:context", expr, param);
				}
			}, this);
			return true;
		} else if(param.isConstArray()) {
			var deps = [];
			param.array.forEach(function(request, idx) {
				var dep, localModule;
				if(request === "require") {
					identifiers[idx] = request;
					dep = "__webpack_require__";
				} else if(["exports", "module"].indexOf(request) >= 0) {
					identifiers[idx] = request;
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
	parser.plugin("call define:amd:item", function(expr, param) {
		if(param.isConditional()) {
			param.options.forEach(function(param) {
				var result = this.applyPluginsBailResult("call define:amd:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call define:amd:context", expr, param);
				}
			}, this);
			return true;
		} else if(param.isString()) {
			var dep, localModule;
			if(param.string === "require") {
				dep = new ConstDependency("__webpack_require__", param.range);
			} else if(["require", "exports", "module"].indexOf(param.string) >= 0) {
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
	parser.plugin("call define:amd:context", function(expr, param) {
		var dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!this.scope.inTry;
		this.state.current.addDependency(dep);
		return true;
	});
};

