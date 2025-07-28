/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const AssetPrefetchPreloadRuntimeModule = require("./AssetPrefetchPreloadRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "AssetPrefetchPreloadPlugin";

class AssetPrefetchPreloadPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// Register runtime module for asset prefetch
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.prefetchAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new AssetPrefetchPreloadRuntimeModule("prefetch")
					);
				});

			// Register runtime module for asset preload
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.preloadAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new AssetPrefetchPreloadRuntimeModule("preload")
					);
				});
		});
	}
}

module.exports = AssetPrefetchPreloadPlugin;
