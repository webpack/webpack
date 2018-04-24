/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/** @typedef {import("./Chunk")} Chunk */

const ChunkGroup = require("./ChunkGroup");
/**
 *
 * @description Entrypoint serves as an encapsulation primitive for chunks that are
 * apart of a single ChunkGroup. They represent all bundles that need to be loaded for a
 * single instance of a page. Multipage App Architectures will typically yeild multiple Entrypoint Objects
 * inside of Compilation, where as a Single Page App, may only contain one with many lazy loaded chunks.
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
	 *
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
	 * @return {Chunk|false} returns the runtime chunk or false
	 * @memberof Entrypoint
	 */
	getRuntimeChunk() {
		return this.runtimeChunk || this.chunks[0];
	}
}

module.exports = Entrypoint;
