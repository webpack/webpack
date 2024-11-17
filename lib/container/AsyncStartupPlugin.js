/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author  Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupEntrypointRuntimeModule = require("../runtime/StartupEntrypointRuntimeModule");
const ContainerEntryModule = require("./ContainerEntryModule");
const {
	JavascriptModulesPlugin
} = require("../javascript/JavascriptModulesPlugin");
/** @typedef {import("../Compiler")} Compiler */

class AsyncStartupPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("AsyncStartupPlugin", compilation => {
			/**
			 * Determines if async initialization should be enabled for a chunk
			 * @param {import("../Chunk")} chunk the chunk
			 * @returns {boolean} true if async initialization should be enabled
			 */
			const shouldEnableAsyncInit = chunk => {
				if (chunk.id === "build time chunk") return false;

				const [finalEntry] =
					Array.from(
						compilation.chunkGraph.getChunkEntryModulesIterable(chunk)
					).reverse() || [];
				// do not wrap remote entry container in promise
				return !(finalEntry instanceof ContainerEntryModule);
			};

			// Handle additional tree runtime requirements
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"AsyncStartupPlugin",
				(chunk, set) => {
					if (!shouldEnableAsyncInit(chunk)) return;
					if (chunk.hasRuntime()) {
						set.add(RuntimeGlobals.startupEntrypoint);
						set.add(RuntimeGlobals.ensureChunk);
						set.add(RuntimeGlobals.ensureChunkIncludeEntries);
					}
				}
			);

			// Handle chunk runtime requirements
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				"AsyncStartupPlugin",
				(chunk, set, { chunkGraph }) => {
					if (!shouldEnableAsyncInit(chunk)) return;
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					set.add(RuntimeGlobals.federationStartup);
				}
			);

			// Handle runtime requirement in tree
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.startupEntrypoint)
				.tap("AsyncStartupPlugin", (chunk, set) => {
					if (!shouldEnableAsyncInit(chunk)) return;
					set.add(RuntimeGlobals.require);
					set.add(RuntimeGlobals.ensureChunk);
					set.add(RuntimeGlobals.ensureChunkIncludeEntries);

					compilation.addRuntimeModule(
						chunk,
						new StartupEntrypointRuntimeModule(true)
					);
				});
			const { renderStartup } =
				JavascriptModulesPlugin.getCompilationHooks(compilation);
		});
	}
}

module.exports = AsyncStartupPlugin;
