/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const ChunkPrefetchFunctionRuntimeModule = require("./ChunkPrefetchFunctionRuntimeModule");
const ChunkPrefetchStartupRuntimeModule = require("./ChunkPrefetchStartupRuntimeModule");
const ChunkPrefetchTriggerRuntimeModule = require("./ChunkPrefetchTriggerRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class ChunkPrefetchPreloadPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ChunkPrefetchPreloadPlugin",
			compilation => {
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					"ChunkPrefetchPreloadPlugin",
					(chunk, set) => {
						const { chunkGraph } = compilation;
						if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
						const startupChildChunks = chunk.getChildIdsByOrders(chunkGraph);
						if (startupChildChunks.prefetch) {
							set.add(RuntimeGlobals.prefetchChunk);
							set.add(RuntimeGlobals.startup);
							compilation.addRuntimeModule(
								chunk,
								new ChunkPrefetchStartupRuntimeModule(
									"prefetch",
									RuntimeGlobals.prefetchChunk,
									startupChildChunks.prefetch
								)
							);
						}
					}
				);
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"ChunkPrefetchPreloadPlugin",
					(chunk, set) => {
						const { chunkGraph } = compilation;
						const chunkMap = chunk.getChildIdsByOrdersMap(chunkGraph, false);

						if (chunkMap.prefetch) {
							set.add(RuntimeGlobals.prefetchChunk);
							compilation.addRuntimeModule(
								chunk,
								new ChunkPrefetchTriggerRuntimeModule(
									"prefetch",
									RuntimeGlobals.prefetchChunk,
									chunkMap.prefetch,
									true
								)
							);
						}
						if (chunkMap.preload) {
							set.add(RuntimeGlobals.preloadChunk);
							compilation.addRuntimeModule(
								chunk,
								new ChunkPrefetchTriggerRuntimeModule(
									"preload",
									RuntimeGlobals.preloadChunk,
									chunkMap.preload,
									false
								)
							);
						}
					}
				);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.prefetchChunk)
					.tap("ChunkPrefetchPreloadPlugin", (chunk, set) => {
						compilation.addRuntimeModule(
							chunk,
							new ChunkPrefetchFunctionRuntimeModule(
								"prefetch",
								RuntimeGlobals.prefetchChunk,
								RuntimeGlobals.prefetchChunkHandlers
							)
						);
						set.add(RuntimeGlobals.prefetchChunkHandlers);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.preloadChunk)
					.tap("ChunkPrefetchPreloadPlugin", (chunk, set) => {
						compilation.addRuntimeModule(
							chunk,
							new ChunkPrefetchFunctionRuntimeModule(
								"preload",
								RuntimeGlobals.preloadChunk,
								RuntimeGlobals.preloadChunkHandlers
							)
						);
						set.add(RuntimeGlobals.preloadChunkHandlers);
					});
			}
		);
	}
}

module.exports = ChunkPrefetchPreloadPlugin;
