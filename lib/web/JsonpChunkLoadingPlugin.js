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

// only a chunk that loads other chunks at runtime emits this
const getJsonpChunkLoadingRuntimeModule = lazyModule(() =>
	require("./JsonpChunkLoadingRuntimeModule")
);

const PLUGIN_NAME = "JsonpChunkLoadingPlugin";

/**
 * Enables browser-side JavaScript chunk loading through the JSONP runtime and
 * adds the supporting runtime requirements for matching chunks.
 */
class JsonpChunkLoadingPlugin {
	/**
	 * Registers compilation hooks that attach the JSONP chunk-loading runtime
	 * module and its dependent runtime globals to chunks using `chunkLoading:
	 * "jsonp"`.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * Determines whether the chunk resolves JavaScript chunks through the
			 * JSONP loading backend.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === "jsonp";
			};
			/** @type {WeakSet<Chunk>} */
			const onceForChunkSet = new WeakSet();
			/**
			 * Adds the JSONP runtime module to a chunk once, along with the core
			 * runtime globals it relies on.
			 * @param {Chunk} chunk chunk
			 * @param {RuntimeRequirements} set runtime requirements
			 */
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				if (!isEnabledForChunk(chunk)) return;
				compilation.addLazyRuntimeModule(
					chunk,
					getJsonpChunkLoadingRuntimeModule,
					(Ctor) => new Ctor(set)
				);
			};
			/**
			 * Installing a chunk, on load or on a hot update, is the only part that writes
			 * the module factories and looks a chunk id up; a base uri or `onChunksLoaded`
			 * comes without either. Kept off `handler`, which runs once per chunk and so
			 * cannot see which of the requirements below the chunk ends up with.
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
				RuntimeGlobals.hmrDownloadUpdateHandlers,
				RuntimeGlobals.hmrDownloadManifest,
				RuntimeGlobals.baseURI,
				RuntimeGlobals.onChunksLoaded
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, handler);
			}
			for (const requirement of [
				RuntimeGlobals.ensureChunkHandlers,
				RuntimeGlobals.chunkCallback,
				RuntimeGlobals.hmrDownloadUpdateHandlers,
				RuntimeGlobals.prefetchChunkHandlers,
				RuntimeGlobals.preloadChunkHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, installHandler);
			}

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.loadScript);
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.loadScript);
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
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
		});
	}
}

module.exports = JsonpChunkLoadingPlugin;
