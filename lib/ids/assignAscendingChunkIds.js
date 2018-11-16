/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

/**
 * @param {Iterable<Chunk>} chunks the chunks
 * @param {Compilation} compilation the compilation
 * @returns {void}
 */
const assignAscendingChunkIds = (chunks, compilation) => {
	const usedIds = new Set();
	if (compilation.usedChunkIds) {
		for (const id of compilation.usedChunkIds) {
			usedIds.add(id);
		}
	}

	for (const chunk of chunks) {
		const chunkId = chunk.id;
		if (chunkId !== null) {
			usedIds.add(chunkId);
		}
	}

	let nextId = 0;
	if (usedIds.size > 0) {
		for (const chunk of chunks) {
			if (chunk.id === null) {
				while (usedIds.has(nextId)) nextId++;
				chunk.id = nextId;
				chunk.ids = [nextId];
				nextId++;
			}
		}
	} else {
		for (const chunk of chunks) {
			if (chunk.id === null) {
				chunk.id = nextId;
				chunk.ids = [nextId];
				nextId++;
			}
		}
	}
};

module.exports = assignAscendingChunkIds;
