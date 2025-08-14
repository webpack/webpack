/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Module")} Module */
/** @typedef {import(".").Entrypoint} Entrypoint */

/**
 * @param {ChunkGroup} chunkGroup the ChunkGroup to connect
 * @param {Chunk} chunk chunk to tie to ChunkGroup
 * @returns {void}
 */
const connectChunkGroupAndChunk = (chunkGroup, chunk) => {
	if (chunkGroup.pushChunk(chunk)) {
		chunk.addGroup(chunkGroup);
	}
};

/**
 * @param {ChunkGroup} parent parent ChunkGroup to connect
 * @param {ChunkGroup} child child ChunkGroup to connect
 * @returns {void}
 */
const connectChunkGroupParentAndChild = (parent, child) => {
	if (parent.addChild(child)) {
		child.addParent(parent);
	}
};

/**
 * @param {Entrypoint} entrypoint the entrypoint
 * @param {Entrypoint} dependOnEntrypoint the dependOnEntrypoint
 * @returns {void}
 */
const connectEntrypointAndDependOn = (entrypoint, dependOnEntrypoint) => {
	entrypoint.addDependOn(dependOnEntrypoint);
};

module.exports.connectChunkGroupAndChunk = connectChunkGroupAndChunk;
module.exports.connectChunkGroupParentAndChild =
	connectChunkGroupParentAndChild;
module.exports.connectEntrypointAndDependOn = connectEntrypointAndDependOn;
