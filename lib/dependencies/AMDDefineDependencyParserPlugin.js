/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const AMDDefineDependency = require("./AMDDefineDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const ConstDependency = require("./ConstDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const DynamicExports = require("./DynamicExports");
const LocalModuleDependency = require("./LocalModuleDependency");
const { addLocalModule, getLocalModule } = require("./LocalModulesHelpers");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const isBoundFunctionExpression = expr => {
	if (expr.type !== "CallExpression") return false;
	if (expr.callee.type !== "MemberExpression") return false;
	if (expr.callee.computed) return false;
	if (expr.callee.object.type !== "FunctionExpression") return false;
	if (expr.callee.property.type !== "Identifier") return false;
	if (expr.callee.property.name !== "bind") return false;
	return true;
};

const isUnboundFunctionExpression = expr => {
	if (expr.type === "FunctionExpression") return true;
	if (expr.type === "ArrowFunctionExpression") return true;
	return false;
};

const isCallable = expr => {
	if (isUnboundFunctionExpression(expr)) return true;
	if (isBoundFunctionExpression(expr)) return true;
	return false;
};

class AMDDefineDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.call
			.for("define")
			.tap(
				"AMDDefineDependencyParserPlugin",
				this.processCallDefine.bind(this, parser)
			);
	}

	processArray(parser, expr, param, identifiers, namedModule) {
		if (param.isArray()) {
			param.items.forEach((param, idx) => {
				if (
					param.isString() &&
					["require", "module", "exports"].includes(param.string)
				)
					identifiers[idx] = param.string;
				const result = this.processItem(parser, expr, param, namedModule);
				if (result === undefined) {
					this.processContext(parser, expr, param);
				}
			});
			return true;
		} else if (param.isConstArray()) {
			const deps = [];
			param.array.forEach((request, idx) => {
				let dep;
				let localModule;
				if (request === "require") {
					identifiers[idx] = request;
					dep = RuntimeGlobals.require;
				} else if (["exports", "module"].includes(request)) {
					identifiers[idx] = request;
					dep = request;
				} else if ((localModule = getLocalModule(parser.state, request))) {
					localModule.flagUsed();
					dep = new LocalModuleDependency(localModule, undefined, false);
					dep.loc = expr.loc;
					parser.state.module.addPresentationalDependency(dep);
				} else {
					dep = this.newRequireItemDependency(request);
					dep.loc = expr.loc;
					dep.optional = !!parser.scope.inTry;
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			});
			const dep = this.newRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}
	processItem(parser, expr, param, namedModule) {
		if (param.isConditional()) {
			param.options.forEach(param => {
				const result = this.processItem(parser, expr, param);
				if (result === undefined) {
					this.processContext(parser, expr, param);
				}
			});
			return true;
		} else if (param.isString()) {
			let dep, localModule;
			if (param.string === "require") {
				dep = new ConstDependency(RuntimeGlobals.require, param.range, [
					RuntimeGlobals.require
				]);
			} else if (param.string === "exports") {
				dep = new ConstDependency("exports", param.range, [
					RuntimeGlobals.exports
				]);
			} else if (param.string === "module") {
				dep = new ConstDependency("module", param.range, [
					RuntimeGlobals.module
				]);
			} else if (
				(localModule = getLocalModule(parser.state, param.string, namedModule))
			) {
				localModule.flagUsed();
				dep = new LocalModuleDependency(localModule, param.range, false);
			} else {
				dep = this.newRequireItemDependency(param.string, param.range);
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
			dep.loc = expr.loc;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}
	processContext(parser, expr, param) {
		const dep = ContextDependencyHelpers.create(
			AMDRequireContextDependency,
			param.range,
			param,
			expr,
			this.options,
			{
				category: "amd"
			},
			parser
		);
		if (!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!parser.scope.inTry;
		parser.state.current.addDependency(dep);
		return true;
	}

	processCallDefine(parser, expr) {
		let array, fn, obj, namedModule;
		switch (expr.arguments.length) {
			case 1:
				if (isCallable(expr.arguments[0])) {
					// define(f() {…})
					fn = expr.arguments[0];
				} else if (expr.arguments[0].type === "ObjectExpression") {
					// define({…})
					obj = expr.arguments[0];
				} else {
					// define(expr)
					// unclear if function or object
					obj = fn = expr.arguments[0];
				}
				break;
			case 2:
				if (expr.arguments[0].type === "Literal") {
					namedModule = expr.arguments[0].value;
					// define("…", …)
					if (isCallable(expr.arguments[1])) {
						// define("…", f() {…})
						fn = expr.arguments[1];
					} else if (expr.arguments[1].type === "ObjectExpression") {
						// define("…", {…})
						obj = expr.arguments[1];
					} else {
						// define("…", expr)
						// unclear if function or object
						obj = fn = expr.arguments[1];
					}
				} else {
					array = expr.arguments[0];
					if (isCallable(expr.arguments[1])) {
						// define([…], f() {})
						fn = expr.arguments[1];
					} else if (expr.arguments[1].type === "ObjectExpression") {
						// define([…], {…})
						obj = expr.arguments[1];
					} else {
						// define([…], expr)
						// unclear if function or object
						obj = fn = expr.arguments[1];
					}
				}
				break;
			case 3:
				// define("…", […], f() {…})
				namedModule = expr.arguments[0].value;
				array = expr.arguments[1];
				if (isCallable(expr.arguments[2])) {
					// define("…", […], f() {})
					fn = expr.arguments[2];
				} else if (expr.arguments[2].type === "ObjectExpression") {
					// define("…", […], {…})
					obj = expr.arguments[2];
				} else {
					// define("…", […], expr)
					// unclear if function or object
					obj = fn = expr.arguments[2];
				}
				break;
			default:
				return;
		}
		DynamicExports.bailout(parser.state);
		let fnParams = null;
		let fnParamsOffset = 0;
		if (fn) {
			if (isUnboundFunctionExpression(fn)) {
				fnParams = fn.params;
			} else if (isBoundFunctionExpression(fn)) {
				fnParams = fn.callee.object.params;
				fnParamsOffset = fn.arguments.length - 1;
				if (fnParamsOffset < 0) {
					fnParamsOffset = 0;
				}
			}
		}
		let fnRenames = new Map();
		if (array) {
			const identifiers = {};
			const param = parser.evaluateExpression(array);
			const result = this.processArray(
				parser,
				expr,
				param,
				identifiers,
				namedModule
			);
			if (!result) return;
			if (fnParams) {
				fnParams = fnParams.slice(fnParamsOffset).filter((param, idx) => {
					if (identifiers[idx]) {
						fnRenames.set(param.name, parser.getVariableInfo(identifiers[idx]));
						return false;
					}
					return true;
				});
			}
		} else {
			const identifiers = ["require", "exports", "module"];
			if (fnParams) {
				fnParams = fnParams.slice(fnParamsOffset).filter((param, idx) => {
					if (identifiers[idx]) {
						fnRenames.set(param.name, parser.getVariableInfo(identifiers[idx]));
						return false;
					}
					return true;
				});
			}
		}
		let inTry;
		if (fn && isUnboundFunctionExpression(fn)) {
			inTry = parser.scope.inTry;
			parser.inScope(fnParams, () => {
				for (const [name, varInfo] of fnRenames) {
					parser.setVariable(name, varInfo);
				}
				parser.scope.inTry = inTry;
				if (fn.body.type === "BlockStatement") {
					parser.detectMode(fn.body.body);
					const prev = parser.prevStatement;
					parser.preWalkStatement(fn.body);
					parser.prevStatement = prev;
					parser.walkStatement(fn.body);
				} else {
					parser.walkExpression(fn.body);
				}
			});
		} else if (fn && isBoundFunctionExpression(fn)) {
			inTry = parser.scope.inTry;
			parser.inScope(
				fn.callee.object.params.filter(
					i => !["require", "module", "exports"].includes(i.name)
				),
				() => {
					for (const [name, varInfo] of fnRenames) {
						parser.setVariable(name, varInfo);
					}
					parser.scope.inTry = inTry;
					if (fn.callee.object.body.type === "BlockStatement") {
						parser.detectMode(fn.callee.object.body.body);
						const prev = parser.prevStatement;
						parser.preWalkStatement(fn.callee.object.body);
						parser.prevStatement = prev;
						parser.walkStatement(fn.callee.object.body);
					} else {
						parser.walkExpression(fn.callee.object.body);
					}
				}
			);
			if (fn.arguments) {
				parser.walkExpressions(fn.arguments);
			}
		} else if (fn || obj) {
			parser.walkExpression(fn || obj);
		}

		const dep = this.newDefineDependency(
			expr.range,
			array ? array.range : null,
			fn ? fn.range : null,
			obj ? obj.range : null,
			namedModule ? namedModule : null
		);
		dep.loc = expr.loc;
		if (namedModule) {
			dep.localModule = addLocalModule(parser.state, namedModule);
		}
		parser.state.module.addPresentationalDependency(dep);
		return true;
	}

	newDefineDependency(
		range,
		arrayRange,
		functionRange,
		objectRange,
		namedModule
	) {
		return new AMDDefineDependency(
			range,
			arrayRange,
			functionRange,
			objectRange,
			namedModule
		);
	}
	newRequireArrayDependency(depsArray, range) {
		return new AMDRequireArrayDependency(depsArray, range);
	}
	newRequireItemDependency(request, range) {
		return new AMDRequireItemDependency(request, range);
	}
}
module.exports = AMDDefineDependencyParserPlugin;
