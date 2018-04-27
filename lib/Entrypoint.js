/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Chunk.js")} Chunk */

const ChunkGroup = require("./ChunkGroup");
/**
 *
 * @description Entrypoint serves as an encapsulation primitive for chunks that are
 * a part of a single ChunkGroup. They represent all bundles that need to be loaded for a
 * single instance of a page. Multi-page application architectures will typically yield multiple Entrypoint objects
 * inside of the compilation, whereas a Single Page App may only contain one with many lazy-loaded chunks.
 * @class Entrypoint
 * @extends {ChunkGroup}
 */
class Entrypoint extends ChunkGroup {
	/**
	 * Creates an instance of Entrypoint.
	 * @param {string} name the name of the entrypoint
	 * @memberof Entrypoint
	 */
	constructor(name) {
		super(name);
		/** @type {Chunk=} */
		this.runtimeChunk = undefined;
	}

	/**
	 * @description isInitial will always return true for Entrypoint ChunkGroup.
	 * @return {true} returns true as all entrypoints are initial ChunkGroups
	 * @memberof Entrypoint
	 */
	isInitial() {
		return true;
	}

	/**
	 * @description Sets the runtimeChunk for an entrypoint.
	 * @param {Chunk} chunk the chunk being set as the runtime chunk.
	 * @return {void}
	 * @memberof Entrypoint
	 */
	setRuntimeChunk(chunk) {
		this.runtimeChunk = chunk;
	}

	/**
	 * @description Fetches the chunk reference containing the webpack bootstrap code
	 * @return {Chunk} returns the runtime chunk or first chunk in `this.chunks`
	 * @memberof Entrypoint
	 */
	getRuntimeChunk() {
		return this.runtimeChunk || this.chunks[0];
	}
}

module.exports = Entrypoint;
