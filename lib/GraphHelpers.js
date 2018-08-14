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
 * @param {AsyncDependenciesBlock} depBlock DepBlock being tied to ChunkGroup
 * @param {ChunkGroup} chunkGroup ChunkGroup being tied to DepBlock
 * @returns {void}
 */
const connectDependenciesBlockAndChunkGroup = (depBlock, chunkGroup) => {
	if (chunkGroup.addBlock(depBlock)) {
		depBlock.chunkGroup = chunkGroup;
	}
};

exports.connectChunkGroupAndChunk = connectChunkGroupAndChunk;
exports.connectChunkGroupParentAndChild = connectChunkGroupParentAndChild;
exports.connectDependenciesBlockAndChunkGroup = connectDependenciesBlockAndChunkGroup;
