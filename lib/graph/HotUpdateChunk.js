/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Chunk = require("./Chunk");

class HotUpdateChunk extends Chunk {
	constructor() {
		super();
	}

	/**
	 * Returns whether this chunk carries a hot update rather than regular output.
	 * @returns {boolean} true for a hot update chunk
	 */
	isHotUpdate() {
		return true;
	}
}

module.exports = HotUpdateChunk;
