/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Chunk = require("./Chunk");

class HotUpdateChunk extends Chunk {
	constructor() {
		super();
		/** @type {(string|number)[]} */
		this.removedModules = undefined;
	}

	updateHash(hash, chunkGraph) {
		super.updateHash(hash, chunkGraph);
		hash.update(JSON.stringify(this.removedModules));
	}
}

module.exports = HotUpdateChunk;
