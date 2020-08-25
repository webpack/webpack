/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("../Compiler")} Compiler */

class CommonJsChunkLoadingPlugin {
	constructor(options) {
		options = options || {};
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const ChunkLoadingRuntimeModule = this.asyncChunkLoading
			? require("./ReadFileChunkLoadingRuntimeModule")
			: require("./RequireChunkLoadingRuntimeModule");
		compiler.hooks.thisCompilation.tap(
			"CommonJsChunkLoadingPlugin",
			compilation => {
				const onceForChunkSet = new WeakSet();
				const handler = (chunk, set) => {
					if (onceForChunkSet.has(chunk)) return;
					onceForChunkSet.add(chunk);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
					set.add(RuntimeGlobals.hasOwnProperty);
					compilation.addRuntimeModule(
						chunk,
						new ChunkLoadingRuntimeModule(set)
					);
				};

				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"CommonJsChunkLoadingPlugin",
					(chunk, set) => {
						if (
							Array.from(chunk.getAllReferencedChunks()).some(
								c =>
									c !== chunk &&
									compilation.chunkGraph.getNumberOfEntryModules(c) > 0
							)
						) {
							set.add(RuntimeGlobals.startupEntrypoint);
							set.add(RuntimeGlobals.externalInstallChunk);
						}
					}
				);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("CommonJsChunkLoadingPlugin", handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap("CommonJsChunkLoadingPlugin", handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadManifest)
					.tap("CommonJsChunkLoadingPlugin", handler);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("CommonJsChunkLoadingPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.getChunkScriptFilename);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap("CommonJsChunkLoadingPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
						set.add(RuntimeGlobals.moduleCache);
						set.add(RuntimeGlobals.hmrModuleData);
						set.add(RuntimeGlobals.moduleFactoriesAddOnly);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadManifest)
					.tap("CommonJsChunkLoadingPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.getUpdateManifestFilename);
					});
			}
		);
	}
}

module.exports = CommonJsChunkLoadingPlugin;
