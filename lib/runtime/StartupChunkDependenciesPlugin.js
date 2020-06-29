/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesRuntimeModule = require("./StartupChunkDependenciesRuntimeModule");
const StartupEntrypointRuntimeModule = require("./StartupEntrypointRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class StartupChunkDependenciesPlugin {
	constructor(options) {
		this.asyncChunkLoading =
			options && typeof options.asyncChunkLoading === "boolean"
				? options.asyncChunkLoading
				: true;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"StartupChunkDependenciesPlugin",
			compilation => {
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"StartupChunkDependenciesPlugin",
					(chunk, set) => {
						if (compilation.chunkGraph.hasChunkEntryDependentChunks(chunk)) {
							set.add(RuntimeGlobals.startup);
							set.add(RuntimeGlobals.ensureChunk);
							set.add(RuntimeGlobals.ensureChunkIncludeEntries);
							compilation.addRuntimeModule(
								chunk,
								new StartupChunkDependenciesRuntimeModule(
									this.asyncChunkLoading
								)
							);
						}
					}
				);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.startupEntrypoint)
					.tap("StartupChunkDependenciesPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.ensureChunk);
						set.add(RuntimeGlobals.ensureChunkIncludeEntries);
						compilation.addRuntimeModule(
							chunk,
							new StartupEntrypointRuntimeModule(this.asyncChunkLoading)
						);
					});
			}
		);
	}
}

module.exports = StartupChunkDependenciesPlugin;
