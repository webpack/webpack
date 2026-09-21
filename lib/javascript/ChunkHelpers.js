/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Entrypoint = require("../graph/Entrypoint");

/** @import Chunk from "../graph/Chunk" */
/** @import ChunkGraph from "../graph/ChunkGraph" */
/** @import Module from "../module/Module" */
/** @import Hash from "../util/Hash" */
/** @import { ChunkHashContext } from "../Compilation" */

/**
 * Returns chunks.
 * @param {Entrypoint} entrypoint a chunk group
 * @param {(Chunk | null)=} excludedChunk1 current chunk which is excluded
 * @param {(Chunk | null)=} excludedChunk2 runtime chunk which is excluded
 * @returns {Set<Chunk>} chunks
 */
const getAllChunks = (entrypoint, excludedChunk1, excludedChunk2) => {
	/** @type {Set<Entrypoint>} */
	const queue = new Set([entrypoint]);
	/** @type {Set<Entrypoint>} */
	const groups = new Set();
	for (const group of queue) {
		if (group !== entrypoint) {
			groups.add(group);
		}
		for (const parent of group.parentsIterable) {
			if (parent instanceof Entrypoint) queue.add(parent);
		}
	}
	groups.add(entrypoint);

	/** @type {Set<Chunk>} */
	const chunks = new Set();
	for (const group of groups) {
		for (const chunk of group.chunks) {
			if (chunk === excludedChunk1) continue;
			if (chunk === excludedChunk2) continue;
			chunks.add(chunk);
		}
	}
	return chunks;
};

/**
 * Returns } Object containing chunk entries and runtime chunk.
 * @param {Chunk} chunk The chunk to get information for
 * @param {ChunkGraph} chunkGraph The chunk graph containing the chunk
 * @returns {{ entries: [Module, Entrypoint | undefined][], runtimeChunk: Chunk | null }} Object containing chunk entries and runtime chunk
 */
function getChunkInfo(chunk, chunkGraph) {
	const entries = [
		...chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
	];
	const runtimeChunk =
		entries.length > 0
			? /** @type {Entrypoint[][]} */
				(entries)[0][1].getRuntimeChunk()
			: null;

	return {
		entries,
		runtimeChunk
	};
}

/**
 * Creates a chunk hash handler
 * @param {string} name The name of the chunk
 * @returns {(chunk: Chunk, hash: Hash, { chunkGraph }: ChunkHashContext) => void} The chunk hash handler
 */
function createChunkHashHandler(name) {
	/**
	 * Processes the provided chunk.
	 * @param {Chunk} chunk The chunk to get information for
	 * @param {Hash} hash The hash to update
	 * @param {ChunkHashContext} chunkHashContext The chunk hash context
	 * @returns {void}
	 */
	return (chunk, hash, { chunkGraph }) => {
		if (chunk.hasRuntime()) return;
		const { entries, runtimeChunk } = getChunkInfo(chunk, chunkGraph);
		hash.update(name);
		hash.update("1");
		if (runtimeChunk && runtimeChunk.hash) {
			// WHY: any change to the runtime chunk must move this hash, and its
			// internal implementation is not ours to depend on or inspect — the import
			// names its hashed filename:
			// import __webpack_require__ from "./runtime-main.e9400aee33633a3973bd.js";
			// https://github.com/webpack/webpack/issues/19439
			hash.update(runtimeChunk.hash);
		}

		const { updateHashForEntryStartup } = require("./StartupHelpers");

		updateHashForEntryStartup(hash, chunkGraph, entries, chunk);
	};
}

module.exports.getAllChunks = getAllChunks;
module.exports.createChunkHashHandler = createChunkHashHandler;
module.exports.getChunkInfo = getChunkInfo;
