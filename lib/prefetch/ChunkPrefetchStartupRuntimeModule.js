/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkChildOfTypeInOrder} ChunkChildOfTypeInOrder */
/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that prefetches selected child chunks once the current startup
 * chunk has finished loading.
 */
class ChunkPrefetchStartupRuntimeModule extends RuntimeModule {
	/**
	 * Stores the chunk relationships that should trigger prefetch requests after
	 * startup has reached the requested loading boundary.
	 * @param {ChunkChildOfTypeInOrder[]} startupChunks chunk ids to trigger when chunks are loaded
	 */
	constructor(startupChunks) {
		super("startup prefetch", RuntimeModule.STAGE_TRIGGER);
		/** @type {ChunkChildOfTypeInOrder[]} */
		this.startupChunks = startupChunks;
	}

	/**
	 * Generates `onChunksLoaded` callbacks that prefetch descendant chunks once
	 * the relevant startup chunks, including the current chunk itself, have been
	 * marked as loaded.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { startupChunks } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const { runtimeTemplate } = compilation;
		return Template.asString(
			startupChunks.map(
				({ onChunks, chunks }) =>
					`${RuntimeGlobals.onChunksLoaded}(0, ${JSON.stringify(
						// This need to include itself to delay execution after this chunk has been fully loaded
						onChunks.filter((c) => c === chunk).map((c) => c.id)
					)}, ${runtimeTemplate.basicFunction(
						"",
						chunks.size < 3
							? Array.from(
									chunks,
									(c) =>
										`${RuntimeGlobals.prefetchChunk}(${JSON.stringify(c.id)});`
								)
							: `${JSON.stringify(Array.from(chunks, (c) => c.id))}.map(${
									RuntimeGlobals.prefetchChunk
								});`
					)}, 5);`
			)
		);
	}
}

module.exports = ChunkPrefetchStartupRuntimeModule;
