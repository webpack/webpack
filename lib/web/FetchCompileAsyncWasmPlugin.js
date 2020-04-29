/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const AsyncWasmChunkLoadingRuntimeModule = require("../wasm-async/AsyncWasmChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class FetchCompileAsyncWasmPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileAsyncWasmPlugin",
			compilation => {
				const generateLoadBinaryCode = path =>
					`fetch(${RuntimeGlobals.publicPath} + ${path})`;

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.instantiateWasm)
					.tap("FetchCompileAsyncWasmPlugin", (chunk, set) => {
						const chunkGraph = compilation.chunkGraph;
						if (
							!chunkGraph.hasModuleInGraph(
								chunk,
								m => m.type === "webassembly/async"
							)
						) {
							return;
						}
						set.add(RuntimeGlobals.publicPath);
						compilation.addRuntimeModule(
							chunk,
							new AsyncWasmChunkLoadingRuntimeModule({
								generateLoadBinaryCode,
								supportsStreaming: true
							})
						);
					});
			}
		);
	}
}

module.exports = FetchCompileAsyncWasmPlugin;
