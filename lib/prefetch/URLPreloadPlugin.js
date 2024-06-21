/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const URLPreloadRuntimeModule = require("./URLPreloadRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "URLPreloadPlugin";

class URLPreloadPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hasPreloadUrl)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.hasOwnProperty);
					compilation.addRuntimeModule(chunk, new URLPreloadRuntimeModule(set));
					return true;
				});
		});
	}
}

module.exports = URLPreloadPlugin;
