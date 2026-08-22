/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import { RuntimeRequirements } from "../Module" */

/**
 * Defines the common js chunk loading plugin options type used by this module.
 * @typedef {object} CommonJsChunkLoadingPluginOptions
 * @property {boolean=} asyncChunkLoading enable async chunk loading
 */

const PLUGIN_NAME = "CommonJsChunkLoadingPlugin";

class CommonJsChunkLoadingPlugin {
	/**
	 * Creates an instance of CommonJsChunkLoadingPlugin.
	 * @param {CommonJsChunkLoadingPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {CommonJsChunkLoadingPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const ChunkLoadingRuntimeModule = this.options.asyncChunkLoading
			? require("./ReadFileChunkLoadingRuntimeModule")
			: require("./RequireChunkLoadingRuntimeModule");
		const chunkLoadingValue = this.options.asyncChunkLoading
			? "async-node"
			: "require";
		new StartupChunkDependenciesPlugin({
			chunkLoading: chunkLoadingValue,
			asyncChunkLoading: this.options.asyncChunkLoading
		}).apply(compiler);
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * Checks whether this common js chunk loading plugin is enabled for chunk.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === chunkLoadingValue;
			};
			/** @type {WeakSet<Chunk>} */
			const onceForChunkSet = new WeakSet();
			/**
			 * Handles the hook callback for this code path.
			 * @param {Chunk} chunk chunk
			 * @param {RuntimeRequirements} set runtime requirements
			 */
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				if (!isEnabledForChunk(chunk)) return;
				compilation.addRuntimeModule(chunk, new ChunkLoadingRuntimeModule(set));
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
				RuntimeGlobals.externalInstallChunk,
				RuntimeGlobals.onChunksLoaded
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, handler);
			}
			for (const requirement of [
				RuntimeGlobals.ensureChunkHandlers,
				RuntimeGlobals.externalInstallChunk,
				RuntimeGlobals.hmrDownloadUpdateHandlers
			]) {
				compilation.hooks.runtimeRequirementInTree
					.for(requirement)
					.tap(PLUGIN_NAME, installHandler);
			}

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.getUpdateManifestFilename);
				});
		});
	}
}

module.exports = CommonJsChunkLoadingPlugin;
