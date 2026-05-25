/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class StartupEntrypointRuntimeModule extends RuntimeModule {
	/**
	 * @param {boolean} asyncChunkLoading use async chunk loading
	 */
	constructor(asyncChunkLoading) {
		super("startup entrypoint");
		/** @type {boolean} */
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const cst = runtimeTemplate.renderConst();
		return `${
			RuntimeGlobals.startupEntrypoint
		} = ${runtimeTemplate.basicFunction("result, chunkIds, fn", [
			"// arguments: chunkIds, moduleId are deprecated",
			`${cst} moduleId = chunkIds;`,
			`if(!fn) chunkIds = result, fn = ${runtimeTemplate.returningFunction(
				`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`
			)};`,
			...(this.asyncChunkLoading
				? [
						`return Promise.all(chunkIds.map(${RuntimeGlobals.ensureChunk}, ${
							RuntimeGlobals.require
						})).then(${runtimeTemplate.basicFunction("", [
							`${cst} r = fn();`,
							"return r === undefined ? result : r;"
						])})`
					]
				: [
						`chunkIds.map(${RuntimeGlobals.ensureChunk}, ${RuntimeGlobals.require})`,
						`${cst} r = fn();`,
						"return r === undefined ? result : r;"
					])
		])}`;
	}
}

module.exports = StartupEntrypointRuntimeModule;
