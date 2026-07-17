/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class AsyncModuleRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {boolean=} deferInterop if defer import is used.
	 */
	constructor(deferInterop = false) {
		super("async module");
		/** @type {boolean} */
		this._deferInterop = deferInterop;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.asyncModule;
		const defer = this._deferInterop;
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const supportsSymbol = runtimeTemplate.supportsSymbol();
		/** @type {(name: string, fallback: string) => string} */
		const renderSymbol = (name, fallback) =>
			supportsSymbol
				? `Symbol("${name}")`
				: `hasSymbol ? Symbol("${name}") : "${fallback}"`;
		return Template.asString([
			...(supportsSymbol
				? []
				: [`${cst} hasSymbol = typeof Symbol === "function";`]),
			`${cst} webpackQueues = ${renderSymbol("webpack queues", "__webpack_queues__")};`,
			`${cst} webpackExports = ${
				defer ? `${RuntimeGlobals.asyncModuleExportSymbol}= ` : ""
			}${renderSymbol("webpack exports", RuntimeGlobals.exports)};`,
			`${cst} webpackError = ${renderSymbol("webpack error", "__webpack_error__")};`,
			defer
				? Template.asString([
						`${cst} webpackDone = ${RuntimeGlobals.asyncModuleDoneSymbol} = ${renderSymbol("webpack done", "__webpack_done__")};`,
						`${cst} webpackDefer = ${RuntimeGlobals.deferredModuleAsyncTransitiveDependenciesSymbol} = ${renderSymbol("webpack defer", "__webpack_defer__")};`,
						`${RuntimeGlobals.deferredModuleAsyncTransitiveDependencies} = ${runtimeTemplate.basicFunction(
							"asyncDeps",
							[
								Template.indent([
									`${cst} hasUnresolvedAsyncSubgraph = asyncDeps.some((id) => {`,
									Template.indent([
										`${cst} cache = __webpack_module_cache__[id];`,
										"return !cache || cache[webpackDone] === false;"
									]),
									"});",
									"if (hasUnresolvedAsyncSubgraph) {",
									Template.indent([
										"return ({ then(onFulfilled, onRejected) { return Promise.all(asyncDeps.map(__webpack_require__)).then(onFulfilled, onRejected) } })"
									]),
									"}"
								])
							]
						)}`
					])
				: "",
			`${cst} resolveQueue = ${runtimeTemplate.basicFunction("queue", [
				`if(${runtimeTemplate.optionalChaining("queue", "d < 1")}) {`,
				Template.indent([
					"queue.d = 1;",
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
			`${cst} wrapDeps = ${runtimeTemplate.returningFunction(
				`deps.map(${runtimeTemplate.basicFunction("dep", [
					'if(dep !== null && typeof dep === "object") {',
					Template.indent([
						defer
							? Template.asString([
									"if(!dep[webpackQueues] && dep[webpackDefer]) {",
									Template.indent([
										`${cst} asyncDeps = ${RuntimeGlobals.deferredModuleAsyncTransitiveDependencies}(dep[webpackDefer]);`,
										"if (asyncDeps) {",
										Template.indent([
											`${cst} d = dep;`,
											"dep = {",
											Template.indent([
												"then(onFulfilled, onRejected) {",
												Template.indent([
													`asyncDeps.then(${runtimeTemplate.returningFunction(
														"onFulfilled(d)"
													)}, onRejected);`
												]),
												"}"
											]),
											"};"
										]),
										"} else return dep;"
									]),
									"}"
								])
							: "",
						"if(dep[webpackQueues]) return dep;",
						"if(dep.then) {",
						Template.indent([
							`${cst} queue = [];`,
							"queue.d = 0;",
							`dep.then(${runtimeTemplate.basicFunction("r", [
								"obj[webpackExports] = r;",
								"resolveQueue(queue);"
							])}, ${runtimeTemplate.basicFunction("e", [
								"obj[webpackError] = e;",
								"resolveQueue(queue);"
							])});`,
							`${cst} obj = {};`,
							defer ? "obj[webpackDefer] = false;" : "",
							`obj[webpackQueues] = ${runtimeTemplate.expressionFunction(
								"fn(queue)",
								"fn"
							)};`,
							"return obj;"
						]),
						"}"
					]),
					"}",
					`${cst} ret = {};`,
					`ret[webpackQueues] = ${runtimeTemplate.emptyFunction()};`,
					"ret[webpackExports] = dep;",
					"return ret;"
				])})`,
				"deps"
			)};`,
			`${fn} = ${runtimeTemplate.basicFunction("module, body, hasAwait", [
				`${lt} queue;`,
				"hasAwait && ((queue = []).d = -1);",
				`${cst} depQueues = new Set();`,
				`${cst} exports = module.exports;`,
				`${lt} currentDeps;`,
				`${lt} outerResolve;`,
				`${lt} reject;`,
				`${cst} promise = new Promise(${runtimeTemplate.basicFunction(
					"resolve, rej",
					["reject = rej;", "outerResolve = resolve;"]
				)});`,
				"promise[webpackExports] = exports;",
				`promise[webpackQueues] = ${runtimeTemplate.expressionFunction(
					`queue && fn(queue), depQueues.forEach(fn), promise["catch"](${runtimeTemplate.emptyFunction()})`,
					"fn"
				)};`,
				"module.exports = promise;",
				`${cst} handle = ${runtimeTemplate.basicFunction("deps", [
					"currentDeps = wrapDeps(deps);",
					`${lt} fn;`,
					`${cst} getResult = ${runtimeTemplate.returningFunction(
						`currentDeps.map(${runtimeTemplate.basicFunction("d", [
							defer ? "if(d[webpackDefer]) return d;" : "",
							"if(d[webpackError]) throw d[webpackError];",
							"return d[webpackExports];"
						])})`
					)}`,
					`${cst} promise = new Promise(${runtimeTemplate.basicFunction(
						"resolve",
						[
							`fn = ${runtimeTemplate.expressionFunction(
								"resolve(getResult)",
								""
							)};`,
							"fn.r = 0;",
							`${cst} fnQueue = ${runtimeTemplate.expressionFunction(
								"q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn)))",
								"q"
							)};`,
							`currentDeps.forEach(${runtimeTemplate.expressionFunction(
								`${
									defer ? "dep[webpackDefer]||" : ""
								}dep[webpackQueues](fnQueue)`,
								"dep"
							)});`
						]
					)});`,
					"return fn.r ? promise : getResult();"
				])}`,
				`${cst} done = ${runtimeTemplate.expressionFunction(
					`(err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)${
						defer
							? ", promise[webpackDone] = true, module.evaluatingAsync = false"
							: ""
					}`,
					"err"
				)}`,
				// Track the async body's whole lifetime (evaluating +
				// evaluating-async states) with a dedicated flag — the sync require
				// wrapper clears `module.evaluating` as soon as `.a` returns, so a
				// deferred namespace reaching this module through a cycle relies on
				// `evaluatingAsync` to keep throwing until it is fully evaluated.
				defer ? "module.evaluatingAsync = true;" : "",
				"body(handle, done);",
				`${runtimeTemplate.optionalChaining("queue", "d < 0")} && (queue.d = 0);`
			])};`
		]);
	}
}

module.exports = AsyncModuleRuntimeModule;
