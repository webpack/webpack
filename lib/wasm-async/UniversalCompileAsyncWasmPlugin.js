/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const AsyncWasmCompileRuntimeModule = require("../wasm-async/AsyncWasmCompileRuntimeModule");
const AsyncWasmLoadingRuntimeModule = require("../wasm-async/AsyncWasmLoadingRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "UniversalCompileAsyncWasmPlugin";

class UniversalCompileAsyncWasmPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalWasmLoading = compilation.outputOptions.wasmLoading;
			/**
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const wasmLoading =
					options && options.wasmLoading !== undefined
						? options.wasmLoading
						: globalWasmLoading;
				return wasmLoading === "universal";
			};
			const generateBeforeStreaming = () =>
				Template.asString([
					"if (!useFetch) {",
					Template.indent(["return fallback();"]),
					"}"
				]);
			/**
			 * @param {string} path path
			 * @returns {string} code
			 */
			const generateBeforeLoadBinaryCode = (path) =>
				Template.asString([
					"var useFetch = typeof document !== 'undefined' || typeof self !== 'undefined';",
					`var wasmUrl = ${path};`
				]);
			/**
			 * @type {(path: string) => string}
			 */
			const generateLoadBinaryCode = () =>
				Template.asString([
					"(useFetch",
					Template.indent([
						`? fetch(new URL(wasmUrl, ${compilation.outputOptions.importMetaName}.url))`
					]),
					Template.indent([
						": Promise.all([import('fs'), import('url')]).then(([{ readFile }, { URL }]) => new Promise((resolve, reject) => {",
						Template.indent([
							`readFile(new URL(wasmUrl, ${compilation.outputOptions.importMetaName}.url), (err, buffer) => {`,
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
						"})))"
					])
				]);

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.instantiateWasm)
				.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
					if (!isEnabledForChunk(chunk)) return;
					if (
						!chunkGraph.hasModuleInGraph(
							chunk,
							(m) => m.type === WEBASSEMBLY_MODULE_TYPE_ASYNC
						)
					) {
						return;
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmLoadingRuntimeModule({
							generateBeforeLoadBinaryCode,
							generateLoadBinaryCode,
							generateBeforeInstantiateStreaming: generateBeforeStreaming,
							supportsStreaming: true
						})
					);
				});

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.compileWasm)
				.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
					if (!isEnabledForChunk(chunk)) return;
					if (
						!chunkGraph.hasModuleInGraph(
							chunk,
							(m) => m.type === WEBASSEMBLY_MODULE_TYPE_ASYNC
						)
					) {
						return;
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmCompileRuntimeModule({
							generateBeforeLoadBinaryCode,
							generateLoadBinaryCode,
							generateBeforeCompileStreaming: generateBeforeStreaming,
							supportsStreaming: true
						})
					);
				});
		});
	}
}

module.exports = UniversalCompileAsyncWasmPlugin;
