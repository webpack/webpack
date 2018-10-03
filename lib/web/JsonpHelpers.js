/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {(string|number)[]} EntryItem */

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Chunk} chunk the chunk
 * @returns {EntryItem[]} serialized entry info:
 * inner arrays have this format [module id, ...chunk ids]
 */
exports.getEntryInfo = (chunkGraph, chunk) => {
	return Array.from(
		chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
	).map(([module, chunkGroup]) =>
		[chunkGraph.getModuleId(module)].concat(
			chunkGroup.chunks.filter(c => c !== chunk).map(c => c.id)
		)
	);
};
