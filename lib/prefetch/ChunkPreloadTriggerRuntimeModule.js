/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Chunk").ChunkChildIdsByOrdersMap} ChunkChildIdsByOrdersMap */

class ChunkPreloadTriggerRuntimeModule extends RuntimeModule {
	/**
	 * @param {ChunkChildIdsByOrdersMap} chunkMap map from chunk to chunks
	 * @param {string=} handlerKey the `ensureChunkHandlers` key to install under (default `"preload"`); `"cssPreload"` reuses the same `preloadChunk` — with no JS `preload` order the JS handler is never registered, so only the CSS `<link as="style">` fires
	 */
	constructor(chunkMap, handlerKey = "preload") {
		super(`chunk ${handlerKey} trigger`, RuntimeModule.STAGE_TRIGGER);
		/** @type {ChunkChildIdsByOrdersMap} */
		this.chunkMap = chunkMap;
		/** @type {string} */
		this.handlerKey = handlerKey;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { chunkMap, handlerKey } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const body = [
			"var chunks = chunkToChildrenMap[chunkId];",
			`Array.isArray(chunks) && chunks.map(${RuntimeGlobals.preloadChunk});`
		];
		return Template.asString([
			Template.asString([
				`var chunkToChildrenMap = ${JSON.stringify(chunkMap, null, "\t")};`,
				`${
					RuntimeGlobals.ensureChunkHandlers
				}.${handlerKey} = ${runtimeTemplate.basicFunction("chunkId", body)};`
			])
		]);
	}
}

module.exports = ChunkPreloadTriggerRuntimeModule;
