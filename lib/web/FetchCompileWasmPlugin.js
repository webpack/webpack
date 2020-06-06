/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const WasmChunkLoadingRuntimeModule = require("../wasm/WasmChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

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
				const generateLoadBinaryCode = path =>
					`fetch(${RuntimeGlobals.publicPath} + ${path})`;

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("FetchCompileWasmPlugin", (chunk, set) => {
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
								mangleImports: this.options.mangleImports
							})
						);
					});
			}
		);
	}
}

module.exports = FetchCompileWasmPlugin;
