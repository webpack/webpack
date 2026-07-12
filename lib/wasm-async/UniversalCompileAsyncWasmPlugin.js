/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

import { WEBASSEMBLY_MODULE_TYPE_ASYNC } from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import AsyncWasmCompileRuntimeModule from "./AsyncWasmCompileRuntimeModule.js";
import AsyncWasmLoadingRuntimeModule from "./AsyncWasmLoadingRuntimeModule.js";
/** @typedef {import("../Chunk.js").default} Chunk */
/** @typedef {import("../Compiler.js").default} Compiler */

const PLUGIN_NAME = "UniversalCompileAsyncWasmPlugin";

/**
 * Enables async WebAssembly loading that works in both browser-like and Node.js
 * environments by selecting the appropriate binary-loading strategy at runtime.
 */
class UniversalCompileAsyncWasmPlugin {
	/**
	 * Registers compilation hooks that attach the universal async wasm runtime
	 * to chunks using `wasmLoading: "universal"`.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalWasmLoading = compilation.outputOptions.wasmLoading;
			/**
			 * Determines whether the chunk should use the universal async wasm
			 * loading backend.
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
			 * Generates setup code that decides whether the current environment can
			 * use `fetch` and captures the wasm module URL.
			 * @param {string} path path
			 * @returns {string} code
			 */
			const generateBeforeLoadBinaryCode = (path) =>
				Template.asString([
					`var useFetch = ${compilation.runtimeTemplate.isWebLikePlatformExpression()};`,
					`var wasmUrl = ${path};`
				]);
			/**
			 * Generates the runtime expression that fetches the binary in browsers
			 * or reads it from the filesystem in Node.js.
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

export default UniversalCompileAsyncWasmPlugin;

export { UniversalCompileAsyncWasmPlugin as "module.exports" };
