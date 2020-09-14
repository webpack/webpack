/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const AsyncWasmChunkLoadingRuntimeModule = require("../wasm-async/AsyncWasmChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class ReadFileCompileAsyncWasmPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ReadFileCompileAsyncWasmPlugin",
			compilation => {
				const globalWasmLoading = compilation.outputOptions.wasmLoading;
				const isEnabledForChunk = chunk => {
					const options = chunk.getEntryOptions();
					const wasmLoading =
						(options && options.wasmLoading) || globalWasmLoading;
					return wasmLoading === "async-node";
				};
				const generateLoadBinaryCode = path =>
					Template.asString([
						"new Promise(function (resolve, reject) {",
						Template.indent([
							"var { readFile } = require('fs');",
							"var { join } = require('path');",
							"",
							"try {",
							Template.indent([
								`readFile(join(__dirname, ${path}), function(err, buffer){`,
								Template.indent([
									"if (err) return reject(err);",
									"",
									"// Fake fetch response",
									"resolve({",
									Template.indent(["arrayBuffer() { return buffer; }"]),
									"});"
								]),
								"});"
							]),
							"} catch (err) { reject(err); }"
						]),
						"})"
					]);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.instantiateWasm)
					.tap("ReadFileCompileAsyncWasmPlugin", (chunk, set) => {
						if (!isEnabledForChunk(chunk)) return;
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
								supportsStreaming: false
							})
						);
					});
			}
		);
	}
}

module.exports = ReadFileCompileAsyncWasmPlugin;
