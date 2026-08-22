/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class ConcatenationWrapRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("concatenation wrap");
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { strictModuleErrorHandling, strictModuleExceptionHandling } =
			outputOptions;
		const fn = RuntimeGlobals.concatenationWrap;
		/** @type {string[]} */
		const runBody = [];
		if (strictModuleErrorHandling) {
			// mirrors the module cache: the error is remembered and rethrown
			runBody.push(
				"try {",
				Template.indent("fn.call(mod.exports, mod, mod.exports);"),
				"} catch (e) {",
				Template.indent(["mod.error = e;", "throw e;"]),
				"}"
			);
		} else if (strictModuleExceptionHandling) {
			// mirrors deleting the cache entry: a later call runs the body again
			runBody.push(
				"var threw = true;",
				"try {",
				Template.indent([
					"fn.call(mod.exports, mod, mod.exports);",
					"threw = false;"
				]),
				"} finally {",
				Template.indent(["if (threw) { body = fn; mod = undefined; }"]),
				"}"
			);
		} else {
			runBody.push("fn.call(mod.exports, mod, mod.exports);");
		}
		return Template.asString([
			"// wrap a concatenated module body as a lazy, memoized accessor; mod is",
			"// set before the body runs so re-entrant calls (require cycles) observe",
			"// the partial exports like Node.js",
			`${fn} = ${runtimeTemplate.basicFunction("body", [
				"var mod;",
				`return ${runtimeTemplate.basicFunction("", [
					"if (body) {",
					Template.indent([
						"var fn = body;",
						"body = 0;",
						"mod = { exports: {} };",
						...runBody
					]),
					"}",
					...(strictModuleErrorHandling
						? ["if (mod.error !== undefined) throw mod.error;"]
						: []),
					"return mod.exports;"
				])};`
			])};`
		]);
	}
}

module.exports = ConcatenationWrapRuntimeModule;
