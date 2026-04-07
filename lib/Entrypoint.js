/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ChunkGroup = require("./ChunkGroup");
const SortableSet = require("./util/SortableSet");

/** @typedef {import("../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("./Chunk")} Chunk */

/** @typedef {{ name?: string } & Omit<EntryDescription, "import">} EntryOptions */

/**
 * Entrypoint serves as an encapsulation primitive for chunks that are
 * a part of a single ChunkGroup. They represent all bundles that need to be loaded for a
 * single instance of a page. Multi-page application architectures will typically yield multiple Entrypoint objects
 * inside of the compilation, whereas a Single Page App may only contain one with many lazy-loaded chunks.
 */
class Entrypoint extends ChunkGroup {
	/**
	 * Creates an instance of Entrypoint.
	 * @param {EntryOptions | string} entryOptions the options for the entrypoint (or name)
	 * @param {boolean=} initial false, when the entrypoint is not initial loaded
	 */
	constructor(entryOptions, initial = true) {
		if (typeof entryOptions === "string") {
			entryOptions = { name: entryOptions };
		}
		super({
			name: entryOptions.name
		});
		this.options = entryOptions;
		/** @type {Chunk=} */
		this._runtimeChunk = undefined;
		/** @type {Chunk=} */
		this._entrypointChunk = undefined;
		/** @type {boolean} */
		this._initial = initial;
		/** @type {SortableSet<Entrypoint>} */
		this._dependOn = new SortableSet();
	}

	/**
	 * Checks whether this entrypoint is initial.
	 * @returns {boolean} true, when this chunk group will be loaded on initial page load
	 */
	isInitial() {
		return this._initial;
	}

	/**
	 * Sets runtime chunk.
	 * @param {Chunk} chunk the chunk being set as the runtime chunk.
	 * @returns {void}
	 */
	setRuntimeChunk(chunk) {
		this._runtimeChunk = chunk;
	}

	/**
	 * Fetches the chunk reference containing the webpack bootstrap code
	 * @returns {Chunk | null} returns the runtime chunk or null if there is none
	 */
	getRuntimeChunk() {
		if (this._runtimeChunk) return this._runtimeChunk;
		for (const parent of this.parentsIterable) {
			if (parent instanceof Entrypoint) return parent.getRuntimeChunk();
		}
		return null;
	}

	/**
	 * Sets entrypoint chunk.
	 * @param {Chunk} chunk the chunk being set as the entrypoint chunk.
	 * @returns {void}
	 */
	setEntrypointChunk(chunk) {
		this._entrypointChunk = chunk;
	}

	/**
	 * Returns the chunk which contains the entrypoint modules
	 * (or at least the execution of them)
	 * @returns {Chunk} chunk
	 */
	getEntrypointChunk() {
		return /** @type {Chunk} */ (this._entrypointChunk);
	}

	/**
	 * Returns true if the replacement was successful.
	 * @param {Chunk} oldChunk chunk to be replaced
	 * @param {Chunk} newChunk New chunk that will be replaced with
	 * @returns {boolean | undefined} returns true if the replacement was successful
	 */
	replaceChunk(oldChunk, newChunk) {
		if (this._runtimeChunk === oldChunk) this._runtimeChunk = newChunk;
		if (this._entrypointChunk === oldChunk) this._entrypointChunk = newChunk;
		return super.replaceChunk(oldChunk, newChunk);
	}

	/**
	 * Adds the provided entrypoint to the entrypoint.
	 * @param {Entrypoint} entrypoint the entrypoint
	 * @returns {void}
	 */
	addDependOn(entrypoint) {
		this._dependOn.add(entrypoint);
	}

	/**
	 * Returns true if the entrypoint is in the dependOn set.
	 * @param {Entrypoint} entrypoint the entrypoint
	 * @returns {boolean} true if the entrypoint is in the dependOn set
	 */
	dependOn(entrypoint) {
		return this._dependOn.has(entrypoint);
	}
}

module.exports = Entrypoint;
