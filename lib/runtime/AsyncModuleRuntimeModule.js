/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class AsyncModuleRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("async module");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.asyncModule;
		return Template.asString([
			'var webpackThen = typeof Symbol === "function" ? Symbol("webpack then") : "__webpack_then__";',
			'var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";',
			'var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";',
			`var completeQueue = ${runtimeTemplate.basicFunction("queue", [
				"if(queue) {",
				Template.indent([
					`queue.forEach(${runtimeTemplate.expressionFunction(
						"fn.r--",
						"fn"
					)});`,
					`queue.forEach(${runtimeTemplate.expressionFunction(
						"fn.r-- ? fn.r++ : fn()",
						"fn"
					)});`
				]),
				"}"
			])}`,
			`var completeFunction = ${runtimeTemplate.expressionFunction(
				"!--fn.r && fn()",
				"fn"
			)};`,
			`var queueFunction = ${runtimeTemplate.expressionFunction(
				"queue ? queue.push(fn) : completeFunction(fn)",
				"queue, fn"
			)};`,
			`var wrapDeps = ${runtimeTemplate.returningFunction(
				`deps.map(${runtimeTemplate.basicFunction("dep", [
					'if(dep !== null && typeof dep === "object") {',
					Template.indent([
						"if(dep[webpackThen]) return dep;",
						"if(dep.then) {",
						Template.indent([
							"var queue = [];",
							`dep.then(${runtimeTemplate.basicFunction("r", [
								"obj[webpackExports] = r;",
								"completeQueue(queue);",
								"queue = 0;"
							])}, ${runtimeTemplate.basicFunction("e", [
								"obj[webpackError] = e;",
								"completeQueue(queue);",
								"queue = 0;"
							])});`,
							"var obj = {};",
							`obj[webpackThen] = ${runtimeTemplate.expressionFunction(
								"queueFunction(queue, fn), dep['catch'](reject)",
								"fn, reject"
							)};`,
							"return obj;"
						]),
						"}"
					]),
					"}",
					"var ret = {};",
					`ret[webpackThen] = ${runtimeTemplate.expressionFunction(
						"completeFunction(fn)",
						"fn"
					)};`,
					"ret[webpackExports] = dep;",
					"return ret;"
				])})`,
				"deps"
			)};`,
			`${fn} = ${runtimeTemplate.basicFunction("module, body, hasAwait", [
				"var queue = hasAwait && [];",
				"var exports = module.exports;",
				"var currentDeps;",
				"var outerResolve;",
				"var reject;",
				"var isEvaluating = true;",
				"var nested = false;",
				`var whenAll = ${runtimeTemplate.basicFunction(
					"deps, onResolve, onReject",
					[
						"if (nested) return;",
						"nested = true;",
						"onResolve.r += deps.length;",
						`deps.map(${runtimeTemplate.expressionFunction(
							"dep[webpackThen](onResolve, onReject)",
							"dep, i"
						)});`,
						"nested = false;"
					]
				)};`,
				`var promise = new Promise(${runtimeTemplate.basicFunction(
					"resolve, rej",
					[
						"reject = rej;",
						`outerResolve = ${runtimeTemplate.expressionFunction(
							"resolve(exports), completeQueue(queue), queue = 0"
						)};`
					]
				)});`,
				"promise[webpackExports] = exports;",
				`promise[webpackThen] = ${runtimeTemplate.basicFunction(
					"fn, rejectFn",
					[
						"if (isEvaluating) { return completeFunction(fn); }",
						"if (currentDeps) whenAll(currentDeps, fn, rejectFn);",
						"queueFunction(queue, fn);",
						"promise['catch'](rejectFn);"
					]
				)};`,
				"module.exports = promise;",
				`body(${runtimeTemplate.basicFunction("deps", [
					"currentDeps = wrapDeps(deps);",
					"var fn;",
					`var getResult = ${runtimeTemplate.returningFunction(
						`currentDeps.map(${runtimeTemplate.basicFunction("d", [
							"if(d[webpackError]) throw d[webpackError];",
							"return d[webpackExports];"
						])})`
					)}`,
					`var promise = new Promise(${runtimeTemplate.basicFunction(
						"resolve, reject",
						[
							`fn = ${runtimeTemplate.expressionFunction(
								"resolve(getResult)"
							)};`,
							"fn.r = 0;",
							"whenAll(currentDeps, fn, reject);"
						]
					)});`,
					"return fn.r ? promise : getResult();"
				])}, ${runtimeTemplate.expressionFunction(
					"err && reject(promise[webpackError] = err), outerResolve()",
					"err"
				)});`,
				"isEvaluating = false;"
			])};`
		]);
	}
}

module.exports = AsyncModuleRuntimeModule;
