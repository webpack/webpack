/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
/** @typedef {import("../Chunk.js").default} Chunk */
/** @typedef {import("../ChunkGraph.js").default} ChunkGraph */

class RuntimeIdRuntimeModule extends RuntimeModule {
	constructor() {
		super("runtimeId");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const runtime = chunk.runtime;
		if (typeof runtime !== "string") {
			throw new Error("RuntimeIdRuntimeModule must be in a single runtime");
		}
		const id = chunkGraph.getRuntimeId(runtime);
		return `${RuntimeGlobals.runtimeId} = ${JSON.stringify(id)};`;
	}
}

export default RuntimeIdRuntimeModule;

export { RuntimeIdRuntimeModule as "module.exports" };
