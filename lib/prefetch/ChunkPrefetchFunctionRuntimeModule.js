/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Compilation from "../Compilation" */

class ChunkPrefetchFunctionRuntimeModule extends RuntimeModule {
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
	 * @param {"prefetch" | "preload"} type "prefetch" or "preload" chunk type function
	 * @param {string | null} runtimeFunction the runtime function name, or `null` where nothing fans out over the handlers
	 * @param {string} runtimeHandlers the runtime handlers
	 */
	constructor(type, runtimeFunction, runtimeHandlers) {
		super(`chunk ${type} function`);
		/** @type {string | null} */
		this.runtimeFunction = runtimeFunction;
		/** @type {string} */
		this.runtimeHandlers = runtimeHandlers;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeFunction, runtimeHandlers } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return Template.asString([
			`${runtimeHandlers} = {};`,
			...(runtimeFunction === null
				? []
				: [
						`${runtimeFunction} = ${runtimeTemplate.basicFunction("chunkId", [
							// map is shorter than forEach
							`Object.keys(${runtimeHandlers}).map(${runtimeTemplate.basicFunction(
								"key",
								`${runtimeHandlers}[key](chunkId);`
							)});`
						])};`
					])
		]);
	}
}

module.exports = ChunkPrefetchFunctionRuntimeModule;
