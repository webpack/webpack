/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const WasmChunkLoadingRuntimeModule = require("../wasm-sync/WasmChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

// TODO webpack 6 remove

class FetchCompileWasmPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileWasmPlugin",
			compilation => {
				const globalWasmLoading = compilation.outputOptions.wasmLoading;
				const isEnabledForChunk = chunk => {
					const options = chunk.getEntryOptions();
					const wasmLoading =
						options && options.wasmLoading !== undefined
							? options.wasmLoading
							: globalWasmLoading;
					return wasmLoading === "fetch";
				};
				const generateLoadBinaryCode = path =>
					`fetch(${RuntimeGlobals.publicPath} + ${path})`;

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("FetchCompileWasmPlugin", (chunk, set) => {
						if (!isEnabledForChunk(chunk)) return;
						const chunkGraph = compilation.chunkGraph;
						if (
							!chunkGraph.hasModuleInGraph(
								chunk,
								m => m.type === "webassembly/sync"
							)
						) {
							return;
						}
						set.add(RuntimeGlobals.moduleCache);
						set.add(RuntimeGlobals.publicPath);
						compilation.addRuntimeModule(
							chunk,
							new WasmChunkLoadingRuntimeModule({
								generateLoadBinaryCode,
								supportsStreaming: true,
								mangleImports: this.options.mangleImports,
								runtimeRequirements: set
							})
						);
					});
			}
		);
	}
}

module.exports = FetchCompileWasmPlugin;
