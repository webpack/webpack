/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that exposes the current compilation hash through
 * `__webpack_require__.h`.
 */
class GetFullHashRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that returns the compilation's full hash.
	 */
	constructor() {
		super("getFullHash");
		/** @type {boolean} */
		this.fullHash = true;
	}

	/**
	 * Generates the runtime function that returns the current full hash string.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return `${RuntimeGlobals.getFullHash} = ${runtimeTemplate.returningFunction(
			JSON.stringify(compilation.hash || "XXXX")
		)}`;
	}
}

module.exports = GetFullHashRuntimeModule;
