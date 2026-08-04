/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const lazyModule = require("../util/lazyModule");

/** @typedef {import("../Compiler")} Compiler */

// only a chunk graph carrying a prefetch/preload relation emits these
const getChunkPrefetchFunctionRuntimeModule = lazyModule(() =>
	require("./ChunkPrefetchFunctionRuntimeModule")
);
const getChunkPrefetchStartupRuntimeModule = lazyModule(() =>
	require("./ChunkPrefetchStartupRuntimeModule")
);
const getChunkPrefetchTriggerRuntimeModule = lazyModule(() =>
	require("./ChunkPrefetchTriggerRuntimeModule")
);
const getChunkPreloadTriggerRuntimeModule = lazyModule(() =>
	require("./ChunkPreloadTriggerRuntimeModule")
);

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
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPrefetchStartupRuntimeModule,
							(Ctor) => new Ctor(startupChildChunks)
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
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPrefetchTriggerRuntimeModule,
							(Ctor) => new Ctor(chunkMap.prefetch)
						);
					}
					if (chunkMap.preload) {
						set.add(RuntimeGlobals.preloadChunk);
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPreloadTriggerRuntimeModule,
							(Ctor) => new Ctor(chunkMap.preload)
						);
					}
					if (chunkMap.cssPreload) {
						// CSS-only preload (`parser.javascript.dynamicImportCssPreload`):
						// reuse `preloadChunk` — with no JS `preload` order the JS
						// handler is never registered, so only the CSS `.s` handler
						// fires (`<link rel="preload" as="style">`).
						set.add(RuntimeGlobals.preloadChunk);
						set.add(RuntimeGlobals.preloadChunkHandlers);
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPreloadTriggerRuntimeModule,
							(Ctor) => new Ctor(chunkMap.cssPreload, "cssPreload")
						);
					}
				}
			);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.prefetchChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addLazyRuntimeModule(
						chunk,
						getChunkPrefetchFunctionRuntimeModule,
						(Ctor) =>
							new Ctor(
								"prefetch",
								RuntimeGlobals.prefetchChunk,
								RuntimeGlobals.prefetchChunkHandlers
							)
					);
					set.add(RuntimeGlobals.prefetchChunkHandlers);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.preloadChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addLazyRuntimeModule(
						chunk,
						getChunkPrefetchFunctionRuntimeModule,
						(Ctor) =>
							new Ctor(
								"preload",
								RuntimeGlobals.preloadChunk,
								RuntimeGlobals.preloadChunkHandlers
							)
					);
					set.add(RuntimeGlobals.preloadChunkHandlers);
				});
		});
	}
}

module.exports = ChunkPrefetchPreloadPlugin;
