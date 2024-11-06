/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const AsyncWasmLoadingRuntimeModule = require("../wasm-async/AsyncWasmLoadingRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

class ReadFileCompileAsyncWasmPlugin {
	constructor({ type = "async-node", import: useImport = false } = {}) {
		this._type = type;
		this._import = useImport;
	}

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
				/**
				 * @param {Chunk} chunk chunk
				 * @returns {boolean} true, if wasm loading is enabled for the chunk
				 */
				const isEnabledForChunk = chunk => {
					const options = chunk.getEntryOptions();
					const wasmLoading =
						options && options.wasmLoading !== undefined
							? options.wasmLoading
							: globalWasmLoading;
					return wasmLoading === this._type;
				};
				const { importMetaName } = compilation.outputOptions;
				/**
				 * @type {(path: string) => string}
				 */
				const generateLoadBinaryCode = this._import
					? path =>
							Template.asString([
								"Promise.all([import('fs'), import('url')]).then(([{ readFile }, { URL }]) => new Promise((resolve, reject) => {",
								Template.indent([
									`readFile(new URL(${path}, ${importMetaName}.url), (err, buffer) => {`,
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
								"}))"
							])
					: path =>
							Template.asString([
								"new Promise(function (resolve, reject) {",
								Template.indent([
									"try {",
									Template.indent([
										"var { readFile } = require('fs');",
										"var { join } = require('path');",
										"",
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
					.tap(
						"ReadFileCompileAsyncWasmPlugin",
						(chunk, set, { chunkGraph }) => {
							if (!isEnabledForChunk(chunk)) return;
							if (
								!chunkGraph.hasModuleInGraph(
									chunk,
									m => m.type === WEBASSEMBLY_MODULE_TYPE_ASYNC
								)
							) {
								return;
							}
							set.add(RuntimeGlobals.publicPath);
							compilation.addRuntimeModule(
								chunk,
								new AsyncWasmLoadingRuntimeModule({
									generateLoadBinaryCode,
									supportsStreaming: false
								})
							);
						}
					);
			}
		);
	}
}

module.exports = ReadFileCompileAsyncWasmPlugin;
