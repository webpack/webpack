/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import ChunkPrefetchFunctionRuntimeModule from "./ChunkPrefetchFunctionRuntimeModule.js";
import ChunkPrefetchStartupRuntimeModule from "./ChunkPrefetchStartupRuntimeModule.js";
import ChunkPrefetchTriggerRuntimeModule from "./ChunkPrefetchTriggerRuntimeModule.js";
import ChunkPreloadTriggerRuntimeModule from "./ChunkPreloadTriggerRuntimeModule.js";
/** @typedef {import("../Compiler.js").default} Compiler */

const PLUGIN_NAME = "ChunkPrefetchPreloadPlugin";

/**
 * Adds runtime support for chunk prefetch and preload relationships discovered
 * in the chunk graph.
 */
class ChunkPrefetchPreloadPlugin {
	/**
	 * Registers compilation hooks that emit the runtime modules responsible for
	 * scheduling chunk prefetch and preload requests.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					const startupChildChunks = chunk.getChildrenOfTypeInOrder(
						chunkGraph,
						"prefetchOrder"
					);
					if (startupChildChunks) {
						set.add(RuntimeGlobals.prefetchChunk);
						set.add(RuntimeGlobals.onChunksLoaded);
						set.add(RuntimeGlobals.exports);
						compilation.addRuntimeModule(
							chunk,
							new ChunkPrefetchStartupRuntimeModule(startupChildChunks),
							compilation.chunkGraph
						);
					}
				}
			);
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					const chunkMap = chunk.getChildIdsByOrdersMap(chunkGraph);

					if (chunkMap.prefetch) {
						set.add(RuntimeGlobals.prefetchChunk);
						compilation.addRuntimeModule(
							chunk,
							new ChunkPrefetchTriggerRuntimeModule(chunkMap.prefetch),
							compilation.chunkGraph
						);
					}
					if (chunkMap.preload) {
						set.add(RuntimeGlobals.preloadChunk);
						compilation.addRuntimeModule(
							chunk,
							new ChunkPreloadTriggerRuntimeModule(chunkMap.preload),
							compilation.chunkGraph
						);
					}
				}
			);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.prefetchChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new ChunkPrefetchFunctionRuntimeModule(
							"prefetch",
							RuntimeGlobals.prefetchChunk,
							RuntimeGlobals.prefetchChunkHandlers
						),
						compilation.chunkGraph
					);
					set.add(RuntimeGlobals.prefetchChunkHandlers);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.preloadChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new ChunkPrefetchFunctionRuntimeModule(
							"preload",
							RuntimeGlobals.preloadChunk,
							RuntimeGlobals.preloadChunkHandlers
						),
						compilation.chunkGraph
					);
					set.add(RuntimeGlobals.preloadChunkHandlers);
				});
		});
	}
}

export default ChunkPrefetchPreloadPlugin;

export { ChunkPrefetchPreloadPlugin as "module.exports" };
