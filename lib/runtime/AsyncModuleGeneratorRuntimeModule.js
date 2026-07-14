/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class AsyncModuleGeneratorRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("async module generator");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.asyncModuleGenerator;
		const cst = runtimeTemplate.renderConst();
		// Wrap a generator-based async module body so it drives like an `async`
		// function: run the generator and resolve each `yield`ed dependency
		// promise, without emitting `async`/`await`.
		return Template.asString([
			`${fn} = ${runtimeTemplate.returningFunction(
				runtimeTemplate.basicFunction(
					"__webpack_handle_async_dependencies__, __webpack_async_result__",
					[
						`${cst} gen = body(__webpack_handle_async_dependencies__, __webpack_async_result__);`,
						`${cst} step = ${runtimeTemplate.basicFunction("key, arg", [
							`${cst} info = gen[key](arg);`,
							"if (info.done) return;",
							`Promise.resolve(info.value).then(${runtimeTemplate.expressionFunction(
								'step("next", value)',
								"value"
							)}, ${runtimeTemplate.expressionFunction(
								'step("throw", err)',
								"err"
							)});`
						])};`,
						'step("next");'
					]
				),
				"body"
			)};`
		]);
	}
}

module.exports = AsyncModuleGeneratorRuntimeModule;
