/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Runtime module that publishes the current chunk name for consumers that need
 * it at runtime.
 */
class ChunkNameRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that exposes a chunk's configured name.
	 * @param {string} chunkName the chunk's name
	 */
	constructor(chunkName) {
		super("chunkName");
		/** @type {string} */
		this.chunkName = chunkName;
	}

	/**
	 * Generates the assignment that stores the chunk name on the runtime
	 * globals object.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.chunkName} = ${JSON.stringify(this.chunkName)};`;
	}
}

module.exports = ChunkNameRuntimeModule;
