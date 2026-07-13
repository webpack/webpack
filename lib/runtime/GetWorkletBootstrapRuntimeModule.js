/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Provides a single object URL (one per base URI) for the worklet bootstrap
 * script. A worklet global scope has no `self` and no `location`; this script
 * sets them up before the emitted chunks — which assume a worker-like scope —
 * are added via `addModule`. Deduping by base URI avoids leaking a new object
 * URL per worklet.
 */
class GetWorkletBootstrapRuntimeModule extends RuntimeModule {
	constructor() {
		super("get worklet bootstrap", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { getWorkletBootstrap, baseURI } = RuntimeGlobals;
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		// The arrow inside the blob string is fine — it runs in the worklet (always
		// a module scope); the surrounding functions must respect `output.environment`.
		const getter = runtimeTemplate.basicFunction("", [
			`var base = ${baseURI};`,
			"if (!cache.has(base)) {",
			Template.indent([
				"var script = [",
				Template.indent([
					// worklet scopes have no `self`; chunks assume a worker-like scope
					'"globalThis.self = globalThis.self || globalThis;",',
					// some runtime modules read `location`; forward the document base
					'"globalThis.location = " + JSON.stringify(base) + ";"'
				]),
				'].join("\\n");',
				'cache.set(base, URL.createObjectURL(new Blob([script], { type: "text/javascript" })));'
			]),
			"}",
			"return cache.get(base);"
		]);
		return `${getWorkletBootstrap} = (${runtimeTemplate.basicFunction("", [
			"var cache = new Map();",
			`return ${getter};`
		])})();`;
	}
}

module.exports = GetWorkletBootstrapRuntimeModule;
