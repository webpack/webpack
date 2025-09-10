/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class ChunkPrefetchFunctionRuntimeModule extends RuntimeModule {
	/**
	 * @param {"prefetch" | "preload"} type "prefetch" or "preload" chunk type function
	 * @param {string} runtimeFunction the runtime function name
	 * @param {string} runtimeHandlers the runtime handlers
	 */
	constructor(type, runtimeFunction, runtimeHandlers) {
		super(`chunk ${type} function`);
		this.runtimeFunction = runtimeFunction;
		this.runtimeHandlers = runtimeHandlers;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeFunction, runtimeHandlers } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return Template.asString([
			`${runtimeHandlers} = {};`,
			`${runtimeFunction} = ${runtimeTemplate.basicFunction("chunkId", [
				// map is shorter than forEach
				`Object.keys(${runtimeHandlers}).map(${runtimeTemplate.basicFunction(
					"key",
					`${runtimeHandlers}[key](chunkId);`
				)});`
			])}`
		]);
	}
}

module.exports = ChunkPrefetchFunctionRuntimeModule;
