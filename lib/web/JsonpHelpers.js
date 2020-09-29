/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {(string|number)[]} EntryItem */

// TODO move to this file to ../javascript/ChunkHelpers.js

/**
 * @param {ChunkGroup} chunkGroup a chunk group
 * @returns {Set<Chunk>} chunks
 */
const getAllChunks = chunkGroup => {
	const queue = new Set([chunkGroup]);
	const chunks = new Set();
	for (const chunkGroup of queue) {
		for (const chunk of chunkGroup.chunks) {
			chunks.add(chunk);
		}
		for (const parent of chunkGroup.parentsIterable) {
			queue.add(parent);
		}
	}
	return chunks;
};

/**
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Chunk} chunk the chunk
 * @param {function(Chunk): boolean} chunkFilter the chunk filter function
 * @returns {EntryItem[]} serialized entry info:
 * inner arrays have this format [module id, ...chunk ids]
 */
exports.getEntryInfo = (chunkGraph, chunk, chunkFilter) => {
	return Array.from(
		chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
	).map(([module, chunkGroup]) => {
		const arr = [chunkGraph.getModuleId(module)];
		for (const c of getAllChunks(chunkGroup)) {
			if (!chunkFilter(c) && !c.hasRuntime()) continue;
			const id = c.id;
			if (id === chunk.id) continue;
			arr.push(id);
		}
		return arr;
	});
};

/**
 * @param {Compilation} compilation the compilation
 * @param {Chunk} chunk the chunk
 * @returns {boolean} true, when other chunks have this chunk as runtime chunk
 */
exports.needEntryDeferringCode = (compilation, chunk) => {
	for (const entrypoint of compilation.entrypoints.values()) {
		if (entrypoint.getRuntimeChunk() === chunk) {
			if (entrypoint.chunks.length > 1 || entrypoint.chunks[0] !== chunk)
				return true;
		}
	}
	for (const entrypoint of compilation.asyncEntrypoints) {
		if (entrypoint.getRuntimeChunk() === chunk) {
			if (entrypoint.chunks.length > 1 || entrypoint.chunks[0] !== chunk)
				return true;
		}
	}
	return false;
};
