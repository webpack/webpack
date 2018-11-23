/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const WasmChunkLoadingRuntimePlugin = require("../wasm/WasmChunkLoadingRuntimePlugin");

/** @typedef {import("../Compiler")} Compiler */

class FetchCompileWasmPlugin {
	constructor(options) {
		this.options = options || {};
	}

	/**
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
							!chunkGraph.hasModuleInGraph(chunk, m =>
								m.type.startsWith("webassembly")
							)
						) {
							return;
						}
						set.add(RuntimeGlobals.moduleCache);
						set.add(RuntimeGlobals.publicPath);
						compilation.addRuntimeModule(
							chunk,
							new WasmChunkLoadingRuntimePlugin(chunk, compilation, {
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
