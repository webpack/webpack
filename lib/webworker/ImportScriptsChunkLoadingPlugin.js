/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const lazyModule = require("../util/lazyModule");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import { RuntimeRequirements } from "../Module" */

// only a chunk that loads other chunks at runtime emits this
const getImportScriptsChunkLoadingRuntimeModule = lazyModule(() =>
	require("./ImportScriptsChunkLoadingRuntimeModule")
);

const PLUGIN_NAME = "ImportScriptsChunkLoadingPlugin";

/**
 * Enables worker-side chunk loading via `importScripts` and wires in the
 * runtime helpers needed for startup, loading, and hot updates.
 */
class ImportScriptsChunkLoadingPlugin {
	/**
	 * Registers compilation hooks that attach the `importScripts` chunk-loading
	 * runtime and its supporting globals to chunks using that backend.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new StartupChunkDependenciesPlugin({
			chunkLoading: "import-scripts",
			asyncChunkLoading: true
		}).apply(compiler);
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * Determines whether the chunk resolves additional chunks through the
			 * worker-side `importScripts` backend.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === "import-scripts";
			};
			/** @type {WeakSet<Chunk>} */
			const onceForChunkSet = new WeakSet();
			/**
			 * Adds the `importScripts` chunk-loading runtime module to a chunk once
			 * and records the globals it depends on.
			 * @param {Chunk} chunk chunk
			 * @param {RuntimeRequirements} set runtime requirements
			 */
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				if (!isEnabledForChunk(chunk)) return;
				const withCreateScriptUrl = Boolean(
					compilation.outputOptions.trustedTypes
				);
				compilation.addLazyRuntimeModule(
					chunk,
					getImportScriptsChunkLoadingRuntimeModule,
					(Ctor) => new Ctor(set, withCreateScriptUrl)
				);
			};
			/**
			 * Installing a chunk is the only part that writes the module factories and
			 * looks a chunk id up; a base uri or `onChunksLoaded` comes without either.
			 * Kept off `handler`, which runs once per chunk and so cannot see which of the
			 * requirements below the chunk ends up with.
			 * @param {Chunk} chunk chunk
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
				RuntimeGlobals.hmrDownloadUpdateHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, installHandler);
			}
			// Both `importScripts` calls the module emits — loading a chunk and loading a
			// hot update — are wrapped under trusted types.
			for (const requirement of [
				RuntimeGlobals.ensureChunkHandlers,
				RuntimeGlobals.hmrDownloadUpdateHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, (chunk, set) => {
						if (!isEnabledForChunk(chunk)) return;
						if (compilation.outputOptions.trustedTypes) {
							set.add(RuntimeGlobals.createScriptUrl);
						}
					});
			}

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.publicPath);
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

module.exports = ImportScriptsChunkLoadingPlugin;
