/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Chunk = require("./Chunk");

/** @typedef {import("./Chunk").ChunkOptions} ChunkOptions */

class HotUpdateChunk extends Chunk {
	/**
	 * @param {ChunkOptions=} options chunk options
	 */
	constructor(options = Chunk.EMPTY_CHUNK_OPTIONS) {
		super(undefined, options);
	}
}

module.exports = HotUpdateChunk;
