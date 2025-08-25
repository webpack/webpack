/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const AssetResourcePrefetchRuntimeModule = require("./AssetResourcePrefetchRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "AssetResourcePrefetchPlugin";

class AssetResourcePrefetchPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// prefetchAsset
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.prefetchAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.require);
					set.add(RuntimeGlobals.baseURI);
					set.add(RuntimeGlobals.relativeUrl);
					compilation.addRuntimeModule(
						chunk,
						new AssetResourcePrefetchRuntimeModule("prefetch")
					);
					return true;
				});

			// preloadAsset
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.preloadAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.require);
					set.add(RuntimeGlobals.baseURI);
					set.add(RuntimeGlobals.relativeUrl);
					compilation.addRuntimeModule(
						chunk,
						new AssetResourcePrefetchRuntimeModule("preload")
					);
					return true;
				});
		});
	}
}

module.exports = AssetResourcePrefetchPlugin;
