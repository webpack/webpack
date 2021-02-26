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
			`var completeQueue = ${runtimeTemplate.basicFunction("queue", [
				"if(queue) {",
				Template.indent(
					runtimeTemplate.supportsArrowFunction()
						? [
								"queue.forEach(fn => fn.r--);",
								"queue.forEach(fn => fn.r-- ? fn.r++ : fn());"
						  ]
						: [
								"queue.forEach(function(fn) { fn.r--; });",
								"queue.forEach(function(fn) { fn.r-- ? fn.r++ : fn(); });"
						  ]
				),
				"}"
			])}`,
			`var completeFunction = ${
				runtimeTemplate.supportsArrowFunction()
					? "fn => !--fn.r && fn()"
					: "function(fn) { !--fn.r && fn(); }"
			};`,
			`var queueFunction = ${
				runtimeTemplate.supportsArrowFunction()
					? "(queue, fn) => queue ? queue.push(fn) : completeFunction(fn)"
					: "function(queue, fn) { queue ? queue.push(fn) : completeFunction(fn); }"
			};`,
			`var wrapDeps = ${runtimeTemplate.returningFunction(
				`deps.map(${runtimeTemplate.basicFunction("dep", [
					'if(dep !== null && typeof dep === "object") {',
					Template.indent([
						"if(dep[webpackThen]) return dep;",
						"if(dep.then) {",
						Template.indent([
							"var queue = [], result;",
							`dep.then(${runtimeTemplate.basicFunction("r", [
								"obj[webpackExports] = r;",
								"completeQueue(queue);",
								"queue = 0;"
							])});`,
							"var obj = { [webpackThen]: (fn, reject) => { queueFunction(queue, fn); dep.catch(reject); } };",
							"return obj;"
						]),
						"}"
					]),
					"}",
					"return { [webpackThen]: (fn) => { completeFunction(fn); }, [webpackExports]: dep };"
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
						`deps.map(${runtimeTemplate.basicFunction("dep, i", [
							"dep[webpackThen](onResolve, onReject);"
						])});`,
						"nested = false;"
					]
				)};`,
				`var promise = new Promise(${runtimeTemplate.basicFunction(
					"resolve, rej",
					[
						"reject = rej;",
						`outerResolve = ${runtimeTemplate.basicFunction("", [
							"resolve(exports);",
							"completeQueue(queue);",
							"queue = 0;"
						])};`
					]
				)});`,
				"promise[webpackExports] = exports;",
				`promise[webpackThen] = ${runtimeTemplate.basicFunction(
					"fn, rejectFn",
					[
						"if (isEvaluating) { return completeFunction(fn); }",
						"if (currentDeps) whenAll(currentDeps, fn, rejectFn);",
						"queueFunction(queue, fn);",
						"promise.catch(rejectFn);"
					]
				)};`,
				"module.exports = promise;",
				`body(${runtimeTemplate.basicFunction("deps", [
					"if(!deps) return outerResolve();",
					"currentDeps = wrapDeps(deps);",
					"var fn, result;",
					`var promise = new Promise(${runtimeTemplate.basicFunction(
						"resolve, reject",
						[
							`fn = ${runtimeTemplate.returningFunction(
								"resolve(result = currentDeps.map(d => d[webpackExports]))"
							)}`,
							"fn.r = 0;",
							"whenAll(currentDeps, fn, reject);"
						]
					)});`,
					"return fn.r ? promise : result;"
				])}).then(outerResolve, reject);`,
				"isEvaluating = false;"
			])};`
		]);
	}
}

module.exports = AsyncModuleRuntimeModule;
