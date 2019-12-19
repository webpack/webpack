/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class ChunkPrefetchTriggerRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} childType TODO
	 * @param {string} runtimeFunction TODO
	 * @param {Object} chunkMap map from chunk to
	 * @param {boolean} afterChunkLoad true: start after chunk has been loaded, false: start after chunk loading has started
	 */
	constructor(childType, runtimeFunction, chunkMap, afterChunkLoad) {
		super(`chunk ${childType} trigger`, 20);
		this.childType = childType;
		this.runtimeFunction = runtimeFunction;
		this.chunkMap = chunkMap;
		this.afterChunkLoad = afterChunkLoad;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { childType, runtimeFunction, chunkMap, afterChunkLoad } = this;
		const { runtimeTemplate } = this.compilation;
		const body = [
			"var chunks = chunkToChildrenMap[chunkId];",
			"for (var i = 0; Array.isArray(chunks) && i < chunks.length; i++) {",
			Template.indent(`${runtimeFunction}(chunks[i]);`),
			"}"
		];
		return Template.asString([
			chunkMap
				? Template.asString([
						`var chunkToChildrenMap = ${JSON.stringify(chunkMap, null, "\t")};`,
						`${RuntimeGlobals.ensureChunkHandlers}.${childType} = ${
							afterChunkLoad
								? runtimeTemplate.basicFunction("chunkId, promises", [
										`Promise.all(promises).then(${runtimeTemplate.basicFunction(
											"",
											body
										)});`
								  ])
								: runtimeTemplate.basicFunction("chunkId", body)
						};`
				  ])
				: `// no chunks to automatically ${childType} specified in graph`
		]);
	}
}

module.exports = ChunkPrefetchTriggerRuntimeModule;
