"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const ConstDependency = require("./ConstDependency");
const AMDDefineDependency = require("./AMDDefineDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModulesHelpers = require("./LocalModulesHelpers");
function isBoundFunctionExpression(expr) {
	if(expr.type !== "CallExpression") {
		return false;
	}
	if(expr.callee.type !== "MemberExpression") {
		return false;
	}
	if(expr.callee.computed) {
		return false;
	}
	if(expr.callee.object.type !== "FunctionExpression") {
		return false;
	}
	if(expr.callee.property.type !== "Identifier") {
		return false;
	}
	if(expr.callee.property.name !== "bind") {
		return false;
	}
	return true;
}
class AMDDefineDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		parser.plugin("call define", function(expr) {
			let array;
			let fn;
			let obj;
			let namedModule;
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
						if(expr.arguments[1].type === "FunctionExpression" || isBoundFunctionExpression((expr.arguments[1]))) {
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
						} else if(expr.arguments[1].type === "ObjectExpression") {
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
					} else if(expr.arguments[2].type === "ObjectExpression") {
						// define("...", [...], {...})
						obj = expr.arguments[2];
					} else {
						// define("...", [...], expr)
						// unclear if function or object
						obj = fn = expr.arguments[2];
					}
					break;
				default:
					return;
			}
			let fnParams = null;
			let fnParamsOffset = 0;
			if(fn) {
				if(fn.type === "FunctionExpression") {
					fnParams = fn.params;
				} else if(isBoundFunctionExpression(fn)) {
					let lcFn = fn;
					fnParams = lcFn.callee.object.params;
					fnParamsOffset = lcFn.arguments.length - 1;
					if(fnParamsOffset < 0) {
						fnParamsOffset = 0;
					}
				}
			}
			const fnRenames = Object.create(this.scope.renames);
			let identifiers;
			if(array) {
				identifiers = {};
				const param = this.evaluateExpression(array);
				const result = this.applyPluginsBailResult("call define:amd:array", expr, param, identifiers, namedModule);
				if(!result) {
					return;
				}
				if(fnParams) {
					fnParams = fnParams.slice(fnParamsOffset)
						.filter((param, idx) => {
							if(identifiers[idx]) {
								fnRenames[`$${param.name}`] = identifiers[idx];
								return false;
							}
							return true;
						});
				}
			} else {
				identifiers = ["require", "exports", "module"];
				if(fnParams) {
					fnParams = fnParams.slice(fnParamsOffset)
						.filter((param, idx) => {
							if(identifiers[idx]) {
								fnRenames[`$${param.name}`] = identifiers[idx];
								return false;
							}
							return true;
						});
				}
			}
			let inTry;
			if(fn && fn.type === "FunctionExpression") {
				inTry = this.scope.inTry;
				let lcFn = fn;
				this.inScope(fnParams, () => {
					this.scope.renames = fnRenames;
					this.scope.inTry = inTry;
					if(lcFn.body.type === "BlockStatement") {
						this.walkStatement(lcFn.body);
					} else {
						this.walkExpression(lcFn.body);
					}
				});
			} else if(fn && isBoundFunctionExpression(fn)) {
				inTry = this.scope.inTry;
				let lcFn = fn;
				this.inScope(lcFn.callee.object.params.filter((i) => [
					"require", "module",
					"exports"
				].indexOf(i.name) < 0), () => {
					this.scope.renames = fnRenames;
					this.scope.inTry = inTry;
					if(lcFn.callee.object.body.type === "BlockStatement") {
						this.walkStatement(lcFn.callee.object.body);
					} else {
						this.walkExpression(lcFn.callee.object.body);
					}
				});
				if(lcFn.arguments) {
					this.walkExpressions(lcFn.arguments);
				}
			} else if(fn || obj) {
				this.walkExpression(fn || obj);
			}
			const dep = new AMDDefineDependency(expr.range, array ? array.range : null, fn ? fn.range : null, obj
				? obj.range
				: null);
			dep.loc = expr.loc;
			if(namedModule) {
				dep.localModule = LocalModulesHelpers.addLocalModule(this.state, namedModule);
			}
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("call define:amd:array", function(expr, param, identifiers, namedModule) {
			if(param.isArray()) {
				param.items.forEach(function(param, idx) {
					if(param.isString() && ["require", "module", "exports"].indexOf(param.string) >= 0) {
						identifiers[idx] = param.string;
					}
					const result = this.applyPluginsBailResult("call define:amd:item", expr, param, namedModule);
					if(result === undefined) {
						this.applyPluginsBailResult("call define:amd:context", expr, param);
					}
				}, this);
				return true;
			} else if(param.isConstArray()) {
				const deps = [];
				param.array.forEach(function(request, idx) {
					let dep;
					let localModule;
					if(request === "require") {
						identifiers[idx] = request;
						dep = "__webpack_require__";
					} else if(["exports", "module"].indexOf(request) >= 0) {
						identifiers[idx] = request;
						dep = request;
					} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, request)) { // eslint-disable-line no-cond-assign
						// eslint-disable-line no-cond-assign
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
				const dep = new AMDRequireArrayDependency(deps, param.range);
				dep.loc = expr.loc;
				dep.optional = !!this.scope.inTry;
				this.state.current.addDependency(dep);
				return true;
			}
		});
		parser.plugin("call define:amd:item", function(expr, param, namedModule) {
			if(param.isConditional()) {
				param.options.forEach(function(param) {
					const result = this.applyPluginsBailResult("call define:amd:item", expr, param);
					if(result === undefined) {
						this.applyPluginsBailResult("call define:amd:context", expr, param);
					}
				}, this);
				return true;
			} else if(param.isString()) {
				let dep;
				let localModule;
				if(param.string === "require") {
					dep = new ConstDependency("__webpack_require__", param.range);
				} else if(["require", "exports", "module"].indexOf(param.string) >= 0) {
					dep = new ConstDependency(param.string, param.range);
				} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, param.string, namedModule)) { // eslint-disable-line no-cond-assign
					// eslint-disable-line no-cond-assign
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
			const dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
			if(!dep) {
				return;
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		});
	}
}
module.exports = AMDDefineDependencyParserPlugin;
