/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Chunk from "../graph/Chunk" */
/** @import ChunkGroup from "../graph/ChunkGroup" */

/**
 * Whether `import()` of the chunk group loads the chunk: a chunk with the runtime is
 * already loaded and one without an id can't be named.
 * @param {Chunk} chunk a chunk of the group
 * @returns {boolean} true, when `import()` loads it
 */
const isLoadedChunk = (chunk) => !chunk.hasRuntime() && chunk.id !== null;

/**
 * Returns the chunks `import()` of the chunk group loads, in group order.
 * @param {ChunkGroup} chunkGroup the chunk group
 * @returns {Chunk[]} the loaded chunks
 */
const getLoadedChunks = (chunkGroup) => chunkGroup.chunks.filter(isLoadedChunk);

/**
 * Returns the last chunk `import()` of the chunk group loads.
 * @param {ChunkGroup} chunkGroup the chunk group
 * @returns {Chunk | undefined} the last loaded chunk
 */
const getLastLoadedChunk = (chunkGroup) => {
	const { chunks } = chunkGroup;
	for (let i = chunks.length - 1; i >= 0; i--) {
		if (isLoadedChunk(chunks[i])) return chunks[i];
	}
};

/**
 * Whether two chunk groups load the same chunks besides their shared last one.
 * @param {ChunkGroup} a a chunk group
 * @param {ChunkGroup} b another chunk group
 * @returns {boolean} true, when they load the same chunks
 */
const loadSameChunks = (a, b) => {
	const chunksA = getLoadedChunks(a);
	const chunksB = getLoadedChunks(b);
	if (chunksA.length !== chunksB.length) return false;
	const set = new Set(chunksA);
	for (const chunk of chunksB) {
		if (!set.has(chunk)) return false;
	}
	return true;
};

/**
 * Returns the chunk that stands for the async chunk group under HMR: the runtime loads
 * the group's other chunks when asked for it. A last chunk that also ends an async group
 * loading other chunks can't stand for either, since the runtime couldn't tell them apart.
 * @param {ChunkGroup} chunkGroup an async chunk group
 * @returns {Chunk | undefined} the stand-in, if the group has one
 */
const getStandInChunk = (chunkGroup) => {
	const last = getLastLoadedChunk(chunkGroup);
	if (last === undefined || last.getNumberOfGroups() === 1) return last;
	for (const other of last.groupsIterable) {
		if (
			other !== chunkGroup &&
			!other.isInitial() &&
			getLastLoadedChunk(other) === last &&
			!loadSameChunks(chunkGroup, other)
		) {
			return undefined;
		}
	}
	return last;
};

/**
 * Whether the chunk group loads chunks but none can stand for it under HMR.
 * @param {ChunkGroup} chunkGroup an async chunk group
 * @returns {boolean} true, when its last chunk ends groups loading other chunks
 */
const hasNoStandIn = (chunkGroup) => {
	const last = getLastLoadedChunk(chunkGroup);
	return (
		last !== undefined &&
		last.getNumberOfGroups() > 1 &&
		getStandInChunk(chunkGroup) === undefined
	);
};

module.exports.getLoadedChunks = getLoadedChunks;
module.exports.getStandInChunk = getStandInChunk;
module.exports.hasNoStandIn = hasNoStandIn;
