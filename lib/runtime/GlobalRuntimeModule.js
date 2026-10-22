/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Template = require("../template/Template");
const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class GlobalRuntimeModule extends RuntimeModule {
	constructor() {
		super("global");
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
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		// `environment.globalThis` promises the binding is there, so nothing has to
		// be searched for.
		if (compilation.outputOptions.environment.globalThis) {
			return `${RuntimeGlobals.global} = globalThis;`;
		}
		return Template.asString([
			`${RuntimeGlobals.global} = (function() {`,
			Template.indent([
				"if (typeof globalThis === 'object') return globalThis;",
				"try {",
				Template.indent(
					// This works in non-strict mode
					// or
					// This works if eval is allowed (see CSP)
					"return this || new Function('return this')();"
				),
				"} catch (e) {",
				Template.indent(
					// This works if the window reference is available
					"if (typeof window === 'object') return window;"
				),
				"}"
				// It can still be `undefined`, and nothing here can help that. Returning
				// `undefined` rather than nothing keeps `if (!global)` working.
			]),
			"})();"
		]);
	}
}

module.exports = GlobalRuntimeModule;
