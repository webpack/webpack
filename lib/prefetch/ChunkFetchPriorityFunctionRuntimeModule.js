/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class ChunkFetchPriorityFunctionRuntimeModule extends RuntimeModule {
	/**
	 * @param {Record<Chunk["id"], { prefetchOrder?: number, fetchPriority: RawChunkGroupOptions["fetchPriority"]}>} chunksFetchPriorityMap map of chunk id to fetch priority
	 */
	constructor(chunksFetchPriorityMap) {
		super(`chunk fetch priority function`);
		this.chunksFetchPriorityMap = chunksFetchPriorityMap;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunksFetchPriorityMap } = this;
		const { runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.getFetchPriority;

		return Template.asString([
			`${fn} = ${runtimeTemplate.returningFunction(
				`{${Object.keys(chunksFetchPriorityMap).map(
					id =>
						`${JSON.stringify(id)}:${JSON.stringify(
							chunksFetchPriorityMap[id].fetchPriority
						)}`
				)}}[chunkId]`,
				"chunkId"
			)};`
		]);
	}
}

module.exports = ChunkFetchPriorityFunctionRuntimeModule;
