/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const lazyModule = require("../util/lazyModule");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import { RuntimeRequirements } from "../Module" */

// only a chunk that loads other chunks at runtime emits these
const getExportWebpackRequireRuntimeModule = lazyModule(() =>
	require("./ExportWebpackRequireRuntimeModule")
);
const getModuleChunkLoadingRuntimeModule = lazyModule(() =>
	require("./ModuleChunkLoadingRuntimeModule")
);

const PLUGIN_NAME = "ModuleChunkLoadingPlugin";

class ModuleChunkLoadingPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * Checks whether this module chunk loading plugin is enabled for chunk.
			 * @param {Chunk} chunk chunk to check
			 * @returns {boolean} true, when the plugin is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === "import";
			};
			/** @type {WeakSet<Chunk>} */
			const onceForChunkSet = new WeakSet();
			/**
			 * Handles the hook callback for this code path.
			 * @param {Chunk} chunk chunk to check
			 * @param {RuntimeRequirements} set runtime requirements
			 */
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				if (!isEnabledForChunk(chunk)) return;
				compilation.addLazyRuntimeModule(
					chunk,
					getModuleChunkLoadingRuntimeModule,
					(Ctor) => new Ctor(set)
				);
			};
			/**
			 * Installing a chunk is the only part that writes the module factories and
			 * looks a chunk id up; a base uri, `onChunksLoaded` or the hot manifest come
			 * without either. Kept off `handler`, which runs once per chunk and so cannot
			 * see which of the requirements below the chunk ends up with.
			 * @param {Chunk} chunk chunk to check
			 * @param {RuntimeRequirements} set runtime requirements
			 */
			const installHandler = (chunk, set) => {
				if (!isEnabledForChunk(chunk)) return;
				set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				set.add(RuntimeGlobals.hasOwnProperty);
			};
			for (const requirement of [
				RuntimeGlobals.ensureChunkHandlers,
				RuntimeGlobals.baseURI,
				RuntimeGlobals.externalInstallChunk,
				RuntimeGlobals.analyzableChunkImport,
				RuntimeGlobals.onChunksLoaded,
				RuntimeGlobals.hmrDownloadUpdateHandlers,
				RuntimeGlobals.hmrDownloadManifest
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, handler);
			}
			for (const requirement of [
				RuntimeGlobals.ensureChunkHandlers,
				RuntimeGlobals.externalInstallChunk,
				RuntimeGlobals.analyzableChunkImport,
				RuntimeGlobals.hmrDownloadUpdateHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, installHandler);
			}
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.externalInstallChunk)
				.tap(PLUGIN_NAME, (chunk) => {
					if (!isEnabledForChunk(chunk)) return;
					compilation.addLazyRuntimeModule(
						chunk,
						getExportWebpackRequireRuntimeModule,
						(Ctor) => new Ctor()
					);
				});

			// A handler that builds its url asks for both directly: an analyzable
			// `import()` may replace `ensureChunkHandlers`, which otherwise pulls them in.
			for (const requirement of [
				RuntimeGlobals.prefetchChunkHandlers,
				RuntimeGlobals.preloadChunkHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
						if (!isEnabledForChunk(chunk)) return;
						// A baked url carries where the chunk is, so neither is read for it.
						// Asked as the runtime module asks, so the two always agree.
						const baked = compilation.runtimeTemplate.analyzableChunkScriptUrls(
							chunk,
							chunkGraph,
							set
						);
						if (baked !== null && baked.complete) return;
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getChunkScriptFilename);
					});
			}

			// Keyed on `ensureChunk`, not on the handler map: only the runtime chunk loader
			// builds a URL from a chunk id, and an analyzable `import()` carries its own.
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;

					if (compilation.outputOptions.publicPath !== "auto") {
						set.add(RuntimeGlobals.publicPath);
					}

					set.add(RuntimeGlobals.getChunkScriptFilename);
				});

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					// The hot runtime force-loads through the handler map by bare chunk id, so
					// the map and loader stay however analyzable — but only where there are
					// async chunks to force-load.
					if (chunk.hasAsyncChunks()) {
						set.add(RuntimeGlobals.ensureChunkHandlers);
						set.add(RuntimeGlobals.getChunkScriptFilename);
					}
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				});

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getUpdateManifestFilename);
				});

			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					if (chunkGraph.hasChunkEntryDependentChunks(chunk)) {
						set.add(RuntimeGlobals.externalInstallChunk);
					}
				}
			);
		});
	}
}

module.exports = ModuleChunkLoadingPlugin;
