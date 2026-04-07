/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that defines the helper used to start executing an entrypoint
 * after its dependent chunks have been ensured.
 */
class StartupEntrypointRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that emits `__webpack_require__.X`.
	 * The generated helper supports both legacy call signatures and modern
	 * async chunk-loading flows.
	 * @param {boolean} asyncChunkLoading use async chunk loading
	 */
	constructor(asyncChunkLoading) {
		super("startup entrypoint");
		/** @type {boolean} */
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * Generates the startup helper that loads any required chunks and then runs
	 * the entry module or supplied callback.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return `${
			RuntimeGlobals.startupEntrypoint
		} = ${runtimeTemplate.basicFunction("result, chunkIds, fn", [
			"// arguments: chunkIds, moduleId are deprecated",
			"var moduleId = chunkIds;",
			`if(!fn) chunkIds = result, fn = ${runtimeTemplate.returningFunction(
				`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`
			)};`,
			...(this.asyncChunkLoading
				? [
						`return Promise.all(chunkIds.map(${RuntimeGlobals.ensureChunk}, ${
							RuntimeGlobals.require
						})).then(${runtimeTemplate.basicFunction("", [
							"var r = fn();",
							"return r === undefined ? result : r;"
						])})`
					]
				: [
						`chunkIds.map(${RuntimeGlobals.ensureChunk}, ${RuntimeGlobals.require})`,
						"var r = fn();",
						"return r === undefined ? result : r;"
					])
		])}`;
	}
}

module.exports = StartupEntrypointRuntimeModule;
