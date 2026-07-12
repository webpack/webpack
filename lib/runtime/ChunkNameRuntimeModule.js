/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";

class ChunkNameRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} chunkName the chunk's name
	 */
	constructor(chunkName) {
		super("chunkName");
		/** @type {string} */
		this.chunkName = chunkName;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.chunkName} = ${JSON.stringify(this.chunkName)};`;
	}
}

export default ChunkNameRuntimeModule;

export { ChunkNameRuntimeModule as "module.exports" };
