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
	 * @param {string=} handlerKey the `ensureChunkHandlers` key to install under (default `"preload"`); `"cssPreload"` preloads only the CSS handler so it stays CSS-only even when the build also registers a JS preload handler
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
		// `cssPreload` calls only the CSS preload handler (`preloadChunkHandlers.s`)
		// so it stays CSS-only regardless of a JS preload handler registered
		// elsewhere; plain `preload` fans out to every handler via `preloadChunk`.
		const body =
			handlerKey === "cssPreload"
				? [
						`var handler = ${RuntimeGlobals.preloadChunkHandlers}.s;`,
						"var chunks = chunkToChildrenMap[chunkId];",
						"if (handler && Array.isArray(chunks)) chunks.forEach(handler);"
					]
				: [
						"var chunks = chunkToChildrenMap[chunkId];",
						`Array.isArray(chunks) && chunks.map(${RuntimeGlobals.preloadChunk});`
					];
		return Template.asString([
			`var chunkToChildrenMap = ${JSON.stringify(chunkMap, null, "\t")};`,
			`${
				RuntimeGlobals.ensureChunkHandlers
			}.${handlerKey} = ${runtimeTemplate.basicFunction("chunkId", body)};`
		]);
	}
}

module.exports = ChunkPreloadTriggerRuntimeModule;
