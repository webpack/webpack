/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const lazyModule = require("../util/lazyModule");

/** @import Compiler from "../Compiler" */

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
						// the trigger reaches the CSS `.s` handler itself
						// (`<link rel="preload" as="style">`), so it asks for the handlers
						// alone — nothing here calls the one that fans out over them.
						set.add(RuntimeGlobals.preloadChunkHandlers);
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPreloadTriggerRuntimeModule,
							(Ctor) => new Ctor(chunkMap.cssPreload, "cssPreload")
						);
					}
				}
			);
			// The handlers object is what carries the runtime module, so a chunk asking
			// only for it — a trigger that reaches one handler by name — ships no
			// fan-out function. Whether one is wanted is read here rather than in
			// `create`, which runs after the requirement pass is over.
			for (const [type, fn, handlers] of /** @type {const} */ ([
				[
					"prefetch",
					RuntimeGlobals.prefetchChunk,
					RuntimeGlobals.prefetchChunkHandlers
				],
				[
					"preload",
					RuntimeGlobals.preloadChunk,
					RuntimeGlobals.preloadChunkHandlers
				]
			])) {
				compilation.hooks.runtimeRequirementInTree
					.for(fn)
					.tap(PLUGIN_NAME, (chunk, set) => {
						set.add(handlers);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(handlers)
					.tap(PLUGIN_NAME, (chunk, set) => {
						const runtimeFunction = set.has(fn) ? fn : null;
						compilation.addLazyRuntimeModule(
							chunk,
							getChunkPrefetchFunctionRuntimeModule,
							(Ctor) => new Ctor(type, runtimeFunction, handlers)
						);
					});
			}
		});
	}
}

module.exports = ChunkPrefetchPreloadPlugin;
