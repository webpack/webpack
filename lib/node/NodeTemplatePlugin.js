/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const CommonJsChunkFormatPlugin = require("../javascript/CommonJsChunkFormatPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");

/** @typedef {import("../Compiler")} Compiler */

class NodeTemplatePlugin {
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

		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: this.asyncChunkLoading,
			exposedGlobal: "module.exports"
		}).apply(compiler);
		new CommonJsChunkFormatPlugin().apply(compiler);
		compiler.hooks.thisCompilation.tap("NodeTemplatePlugin", compilation => {
			const onceForChunkSet = new WeakSet();
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				set.add(RuntimeGlobals.hasOwnProperty);
				compilation.addRuntimeModule(chunk, new ChunkLoadingRuntimeModule(set));
			};

			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"NodeTemplatePlugin",
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
				.tap("NodeTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("NodeTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("NodeTemplatePlugin", handler);

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getUpdateManifestFilename);
				});
		});
	}
}

module.exports = NodeTemplatePlugin;
