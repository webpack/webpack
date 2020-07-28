/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const WasmChunkLoadingRuntimeModule = require("../wasm/WasmChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class ReadFileCompileWasmPlugin {
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
			"ReadFileCompileWasmPlugin",
			compilation => {
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
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("ReadFileCompileWasmPlugin", (chunk, set) => {
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
						compilation.addRuntimeModule(
							chunk,
							new WasmChunkLoadingRuntimeModule({
								generateLoadBinaryCode,
								supportsStreaming: false,
								mangleImports: this.options.mangleImports
							})
						);
					});
			}
		);
	}
}

module.exports = ReadFileCompileWasmPlugin;
