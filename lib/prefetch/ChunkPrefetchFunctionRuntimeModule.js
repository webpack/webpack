/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");
const Template = require("../template/Template");
const { getOnlyHandlerKey } = require("../util/handlerKeys");
const { propertyAccess } = require("../util/property");

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
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		// Reads a map rather than installing onto one, so reading its code back would
		// render it in a cycle.
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeFunction, runtimeHandlers } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const only =
			runtimeFunction === null
				? null
				: getOnlyHandlerKey(this, runtimeHandlers);
		return Template.asString([
			`${runtimeHandlers} = {};`,
			...(runtimeFunction === null
				? []
				: [
						`${runtimeFunction} = ${runtimeTemplate.basicFunction("chunkId", [
							// One handler needs no walk over the others, and most chunks carry one.
							only === null
								? // map is shorter than forEach
									`Object.keys(${runtimeHandlers}).map(${runtimeTemplate.basicFunction(
										"key",
										`${runtimeHandlers}[key](chunkId);`
									)});`
								: `${runtimeHandlers}${propertyAccess([only])}(chunkId);`
						])};`
					])
		]);
	}
}

module.exports = ChunkPrefetchFunctionRuntimeModule;
