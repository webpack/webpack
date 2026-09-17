/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const Template = require("../template/Template");

/** @import Compilation from "../Compilation" */
/** @import { ChunkChildIdsByOrdersMap } from "../Chunk" */

class ChunkPrefetchTriggerRuntimeModule extends RuntimeModule {
	/**
	 * @param {ChunkChildIdsByOrdersMap} chunkMap map from chunk to
	 */
	constructor(chunkMap) {
		super("chunk prefetch trigger", RuntimeModule.STAGE_TRIGGER);
		/** @type {ChunkChildIdsByOrdersMap} */
		this.chunkMap = chunkMap;
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return [[RuntimeGlobals.ensureChunkHandlers, "prefetch"]];
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { chunkMap } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const body = [
			"var chunks = chunkToChildrenMap[chunkId];",
			`Array.isArray(chunks) && chunks.map(${RuntimeGlobals.prefetchChunk});`
		];
		return Template.asString([
			Template.asString([
				`var chunkToChildrenMap = ${JSON.stringify(chunkMap, null, "\t")};`,
				`${
					RuntimeGlobals.ensureChunkHandlers
				}.prefetch = ${runtimeTemplate.expressionFunction(
					// Prefetch is best-effort; silence rejections so a failed chunk
					// load (e.g. chunkLoadTimeout) doesn't surface as an unhandled
					// rejection through this dangling Promise.all chain.
					`Promise.all(promises).then(${runtimeTemplate.basicFunction(
						"",
						body
					)}, ${runtimeTemplate.basicFunction("", "")})`,
					"chunkId, promises"
				)};`
			])
		]);
	}
}

module.exports = ChunkPrefetchTriggerRuntimeModule;
