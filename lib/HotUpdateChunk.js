/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Chunk = require("./Chunk");

/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./util/Hash")} Hash */

class HotUpdateChunk extends Chunk {
	constructor() {
		super();
		/** @type {(string|number)[]} */
		this.removedModules = undefined;
	}

	/**
	 * @param {Hash} hash hash (will be modified)
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		hash.update(JSON.stringify(this.removedModules));
	}
}

module.exports = HotUpdateChunk;
