/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

class RemoveEmptyChunksPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveEmptyChunksPlugin", compilation => {
			/**
			 * @param {Chunk[]} chunks the chunks array
			 * @returns {void}
			 */
			const handler = chunks => {
				const chunkGraph = compilation.chunkGraph;
				for (let i = chunks.length - 1; i >= 0; i--) {
					const chunk = chunks[i];
					if (
						chunkGraph.getNumberOfChunkModules(chunk) === 0 &&
						!chunk.hasRuntime() &&
						chunkGraph.getNumberOfEntryModules(chunk) === 0
					) {
						compilation.chunkGraph.disconnectChunk(chunk);
						chunks.splice(i, 1);
					}
				}
			};
			compilation.hooks.optimizeChunksBasic.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
			compilation.hooks.optimizeChunksAdvanced.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
		});
	}
}
module.exports = RemoveEmptyChunksPlugin;
