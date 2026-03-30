/*
	MIT License http://www.opensource.org/licenses/MIT
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareChunksNatural } = require("../util/comparators");
const {
	assignDeterministicIds,
	getChunkExportKey,
	getFullChunkName,
	getUsedChunkIds,
} = require("./IdHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

/**
 * @typedef {object} DeterministicChunkIdsPluginOptions
 * @property {string | typeof import("../util/Hash")=} hashFunction the hash function to use
 * @property {number=} maxLength the maximum length of the ids in chars
 */

class DeterministicChunkIdsPlugin {
	/**
	 * @param {DeterministicChunkIdsPluginOptions=} options options object
	 */
	constructor(options = {}) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DeterministicChunkIdsPlugin",
			compilation => {
				compilation.hooks.chunkIds.tap(
					"DeterministicChunkIdsPlugin",
					chunks => {
						const chunkGraph = compilation.chunkGraph;
						const moduleGraph = compilation.moduleGraph;
						const context = compiler.context;
						const hashFunction =
							this.options.hashFunction ||
							compilation.outputOptions.hashFunction;
						const maxLength = this.options.maxLength || 3;

						const usedIds = getUsedChunkIds(compilation);

						// Convert Iterable<Chunk> → Array so we can filter and measure it.
						// `chunks` is typed as Iterable<Chunk> — it has no .size property.
						const chunksArray = Array.from(chunks);
						const unassigned = chunksArray.filter(
							chunk => chunk.id === null
						);

						assignDeterministicIds(
							unassigned,
							/**
							 * Key function — export-aware seed.
							 *
							 * Seed format:  "<fullChunkName>|<exportKey>"
							 *
							 * • fullChunkName  — preserves existing behaviour for named chunks
							 *                   (no churn for projects already using
							 *                   webpackChunkName).
							 * • exportKey      — sorted, pipe-delimited list of every
							 *                   statically-known export name across the chunk's
							 *                   root modules.  Empty string for CJS / unknown.
							 *
							 * Result: IDs are stable when module internals change but the
							 * public export surface stays the same, and correctly bust cache
							 * when exported names are added or removed.
							 *
							 * @param {Chunk} chunk
							 * @returns {string}
							 */
							chunk => {
								const name =
									getFullChunkName(
										chunk,
										chunkGraph,
										context,
										compilation.requestShortener
									) || "";

								const exportKey = getChunkExportKey(
									chunk,
									chunkGraph,
									moduleGraph
								);

								return `${name}|${exportKey}`;
							},
							// comparator — unchanged from the original plugin
							compareChunksNatural(chunkGraph),
							// assignId — sets chunk.id when the slot is free; returns false
							// (retry with next hash) when the numeric id is already taken.
							(chunk, id) => {
								if (usedIds.has(String(id))) return false;
								chunk.id = id;
								chunk.ids = [id];
								usedIds.add(String(id));
								return true;
							},
							// ranges — fill at most ~80 % of the id space; same as original.
							[Math.pow(10, maxLength)],
							// expandFactor — grow the range when collisions are unavoidable.
							10,
							// extraSpace — account for ids already in use.
							usedIds.size,
							// salt — keep existing builds stable (matches original default).
							0
						);
					}
				);
			}
		);
	}
}

module.exports = DeterministicChunkIdsPlugin;