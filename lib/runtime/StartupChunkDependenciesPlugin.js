/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesRuntimeModule = require("./StartupChunkDependenciesRuntimeModule");
const StartupEntrypointRuntimeModule = require("./StartupEntrypointRuntimeModule");

/** @typedef {import("../../declarations/WebpackOptions").ChunkLoadingType} ChunkLoadingType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {object} Options
 * @property {ChunkLoadingType} chunkLoading
 * @property {boolean=} asyncChunkLoading
 */

const PLUGIN_NAME = "StartupChunkDependenciesPlugin";

class StartupChunkDependenciesPlugin {
	/**
	 * @param {Options} options options
	 */
	constructor(options) {
		this.chunkLoading = options.chunkLoading;
		this.asyncChunkLoading =
			typeof options.asyncChunkLoading === "boolean"
				? options.asyncChunkLoading
				: true;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * @param {Chunk} chunk chunk to check
			 * @returns {boolean} true, when the plugin is enabled for the chunk
			 */
			const isEnabledForChunk = chunk => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === this.chunkLoading;
			};

			// -------- FIX INSERTED HERE ----------
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph, moduleGraph }) => {
					if (!isEnabledForChunk(chunk)) return;

					// Skip runtime → removes __webpack_exports__ = {} output
					if (compilation.outputOptions.module) {
						const entryModules = Array.from(
							chunkGraph.getChunkEntryModulesIterable(chunk)
						);

						const allEmpty = entryModules.every(entry => {
							const exportsInfo = moduleGraph.getExportsInfo(entry);
							return exportsInfo.isEmpty();
						});

						if (allEmpty) {
							return;
						}
					}

					if (chunkGraph.hasChunkEntryDependentChunks(chunk)) {
						set.add(RuntimeGlobals.startup);
						set.add(RuntimeGlobals.ensureChunk);
						set.add(RuntimeGlobals.ensureChunkIncludeEntries);
						compilation.addRuntimeModule(
							chunk,
							new StartupChunkDependenciesRuntimeModule(this.asyncChunkLoading)
						);
					}
				}
			);
			// -------- END FIX ----------

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.startupEntrypoint)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (!isEnabledForChunk(chunk)) return;
					set.add(RuntimeGlobals.require);
					set.add(RuntimeGlobals.ensureChunk);
					set.add(RuntimeGlobals.ensureChunkIncludeEntries);
					compilation.addRuntimeModule(
						chunk,
						new StartupEntrypointRuntimeModule(this.asyncChunkLoading)
					);
				});
		});
	}
}

module.exports = StartupChunkDependenciesPlugin;
