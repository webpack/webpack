/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
import Template from "../Template.js";
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Chunk.js").ChunkChildIdsByOrdersMap} ChunkChildIdsByOrdersMap */

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

export default ChunkPrefetchTriggerRuntimeModule;

export { ChunkPrefetchTriggerRuntimeModule as "module.exports" };
