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

/** @typedef {import("estree").ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").FunctionExpression} FunctionExpression */
/** @typedef {import("estree").Literal} Literal */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

/**
 * @param {Expression | SpreadElement} expr expression
 * @returns {boolean} true if it's a bound function expression
 */
const isBoundFunctionExpression = expr => {
	if (expr.type !== "CallExpression") return false;
	if (expr.callee.type !== "MemberExpression") return false;
	if (expr.callee.computed) return false;
	if (expr.callee.object.type !== "FunctionExpression") return false;
	if (expr.callee.property.type !== "Identifier") return false;
	if (expr.callee.property.name !== "bind") return false;
	return true;
};

/** @typedef {FunctionExpression | ArrowFunctionExpression} UnboundFunctionExpression */

/**
 * @param {Expression | SpreadElement} expr expression
 * @returns {boolean} true when unbound function expression
 */
const isUnboundFunctionExpression = expr => {
	if (expr.type === "FunctionExpression") return true;
	if (expr.type === "ArrowFunctionExpression") return true;
	return false;
};

/**
 * @param {Expression | SpreadElement} expr expression
 * @returns {boolean} true when callable
 */
const isCallable = expr => {
	if (isUnboundFunctionExpression(expr)) return true;
	if (isBoundFunctionExpression(expr)) return true;
	return false;
};

class AMDDefineDependencyParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options parserOptions
	 */
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

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @param {Record<number, string>} identifiers identifiers
	 * @param {string=} namedModule named module
	 * @returns {boolean | undefined} result
	 */
	processArray(parser, expr, param, identifiers, namedModule) {
		if (param.isArray()) {
			/** @type {BasicEvaluatedExpression[]} */
			(param.items).forEach((param, idx) => {
				if (
					param.isString() &&
					["require", "module", "exports"].includes(
						/** @type {string} */ (param.string)
					)
				)
					identifiers[/** @type {number} */ (idx)] = param.string;
				const result = this.processItem(parser, expr, param, namedModule);
				if (result === undefined) {
					this.processContext(parser, expr, param);
				}
			});
			return true;
		} else if (param.isConstArray()) {
			/** @type {(string | LocalModuleDependency | AMDRequireItemDependency)[]} */
			const deps = [];
			/** @type {string[]} */
			(param.array).forEach((request, idx) => {
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
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addPresentationalDependency(dep);
				} else {
					dep = this.newRequireItemDependency(request);
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					dep.optional = !!parser.scope.inTry;
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			});
			const dep = this.newRequireArrayDependency(
				deps,
				/** @type {Range} */ (param.range)
			);
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			dep.optional = !!parser.scope.inTry;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @param {string=} namedModule named module
	 * @returns {boolean | undefined} result
	 */
	processItem(parser, expr, param, namedModule) {
		if (param.isConditional()) {
			/** @type {BasicEvaluatedExpression[]} */
			(param.options).forEach(param => {
				const result = this.processItem(parser, expr, param);
				if (result === undefined) {
					this.processContext(parser, expr, param);
				}
			});
			return true;
		} else if (param.isString()) {
			let dep, localModule;
			if (param.string === "require") {
				dep = new ConstDependency(
					RuntimeGlobals.require,
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.require]
				);
			} else if (param.string === "exports") {
				dep = new ConstDependency(
					"exports",
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.exports]
				);
			} else if (param.string === "module") {
				dep = new ConstDependency(
					"module",
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.module]
				);
			} else if (
				(localModule = getLocalModule(
					parser.state,
					/** @type {string} */ (param.string),
					namedModule
				))
			) {
				localModule.flagUsed();
				dep = new LocalModuleDependency(localModule, param.range, false);
			} else {
				dep = this.newRequireItemDependency(
					/** @type {string} */ (param.string),
					param.range
				);
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {boolean | undefined} result
	 */
	processContext(parser, expr, param) {
		const dep = ContextDependencyHelpers.create(
			AMDRequireContextDependency,
			/** @type {Range} */ (param.range),
			param,
			expr,
			this.options,
			{
				category: "amd"
			},
			parser
		);
		if (!dep) return;
		dep.loc = /** @type {DependencyLocation} */ (expr.loc);
		dep.optional = !!parser.scope.inTry;
		parser.state.current.addDependency(dep);
		return true;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @returns {boolean | undefined} result
	 */
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
				namedModule = /** @type {TODO} */ (expr).arguments[0].value;
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
				fnParams = /** @type {UnboundFunctionExpression} */ (fn).params;
			} else if (isBoundFunctionExpression(fn)) {
				fnParams = /** @type {TODO} */ (fn).callee.object.params;
				fnParamsOffset = /** @type {TODO} */ (fn).arguments.length - 1;
				if (fnParamsOffset < 0) {
					fnParamsOffset = 0;
				}
			}
		}
		let fnRenames = new Map();
		if (array) {
			/** @type {Record<number, string>} */
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
		/** @type {boolean | undefined} */
		let inTry;
		if (fn && isUnboundFunctionExpression(fn)) {
			inTry = parser.scope.inTry;
			parser.inScope(fnParams, () => {
				for (const [name, varInfo] of fnRenames) {
					parser.setVariable(name, varInfo);
				}
				parser.scope.inTry = /** @type {boolean} */ (inTry);
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
				/** @type {TODO} */
				(fn).callee.object.params.filter(
					i => !["require", "module", "exports"].includes(i.name)
				),
				() => {
					for (const [name, varInfo] of fnRenames) {
						parser.setVariable(name, varInfo);
					}
					parser.scope.inTry = /** @type {boolean} */ (inTry);
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
			if (/** @type {TODO} */ (fn).arguments) {
				parser.walkExpressions(/** @type {TODO} */ (fn).arguments);
			}
		} else if (fn || obj) {
			parser.walkExpression(fn || obj);
		}

		const dep = this.newDefineDependency(
			/** @type {Range} */ (expr.range),
			array ? /** @type {Range} */ (array.range) : null,
			fn ? /** @type {Range} */ (fn.range) : null,
			obj ? /** @type {Range} */ (obj.range) : null,
			namedModule ? namedModule : null
		);
		dep.loc = /** @type {DependencyLocation} */ (expr.loc);
		if (namedModule) {
			dep.localModule = addLocalModule(parser.state, namedModule);
		}
		parser.state.module.addPresentationalDependency(dep);
		return true;
	}

	/**
	 * @param {Range} range range
	 * @param {Range | null} arrayRange array range
	 * @param {Range | null} functionRange function range
	 * @param {Range | null} objectRange object range
	 * @param {boolean | null} namedModule true, when define is called with a name
	 * @returns {AMDDefineDependency} AMDDefineDependency
	 */
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

	/**
	 * @param {TODO[]} depsArray deps array
	 * @param {Range} range range
	 * @returns {AMDRequireArrayDependency} AMDRequireArrayDependency
	 */
	newRequireArrayDependency(depsArray, range) {
		return new AMDRequireArrayDependency(depsArray, range);
	}

	/**
	 * @param {string} request request
	 * @param {Range=} range range
	 * @returns {AMDRequireItemDependency} AMDRequireItemDependency
	 */
	newRequireItemDependency(request, range) {
		return new AMDRequireItemDependency(request, range);
	}
}

module.exports = AMDDefineDependencyParserPlugin;
