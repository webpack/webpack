/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const { getPresentKinds } = require("../TemplatedPathPlugin");
const AsyncWasmCompileRuntimeModule = require("../wasm-async/AsyncWasmCompileRuntimeModule");
const AsyncWasmLoadingRuntimeModule = require("../wasm-async/AsyncWasmLoadingRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * The wasm runtime inlines `[fullhash]` as a runtime `getFullHash()` call, so
 * that runtime module must be requested (`[hash]` is the per-module hash here).
 * @param {string} filename `output.webassemblyModuleFilename`
 * @returns {boolean} whether it references the compilation `[fullhash]`
 */
const usesFullHash = (filename) => getPresentKinds(filename).has("fullhash");

const PLUGIN_NAME = "FetchCompileAsyncWasmPlugin";

/**
 * Enables asynchronous WebAssembly loading through `fetch` for environments
 * that can instantiate fetched binaries at runtime.
 */
class FetchCompileAsyncWasmPlugin {
	/**
	 * Registers compilation hooks that attach the async fetch-based wasm runtime
	 * to chunks containing async WebAssembly modules.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalWasmLoading = compilation.outputOptions.wasmLoading;
			/**
			 * Determines whether the chunk should load async WebAssembly binaries
			 * through the `fetch` backend.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const wasmLoading =
					options && options.wasmLoading !== undefined
						? options.wasmLoading
						: globalWasmLoading;
				return wasmLoading === "fetch";
			};
			/**
			 * Downloads the emitted wasm binary through the runtime
			 * `__webpack_require__.p` public path.
			 * @param {string} path path to the wasm file
			 * @returns {string} code to load the wasm file
			 */
			const generateLoadBinaryCode = (path) =>
				`fetch(${RuntimeGlobals.publicPath} + ${path})`;
			/**
			 * ESM-output variant: the analyzable `fetch(new URL(path, import.meta.url))`
			 * form (relative to the chunk, no runtime public-path global) that other
			 * bundlers and webpack itself can statically follow to the emitted wasm.
			 * @param {string} path path to the wasm file
			 * @returns {string} code to load the wasm file
			 */
			const generateAnalyzableLoadBinaryCode = (path) =>
				`fetch(${compilation.runtimeTemplate.importMetaUrl(path)})`;
			/**
			 * The call site already passes a complete `URL`, so no base is applied here.
			 * @param {string} path the wasm binary's URL expression
			 * @returns {string} code to load the wasm file
			 */
			const generateBakedLoadBinaryCode = (path) => `fetch(${path})`;

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
					const baked = compilation.runtimeTemplate.supportsAnalyzableWasm();
					const analyzable =
						compilation.runtimeTemplate.supportsAnalyzableEsmUrl();
					// A baked URL carries the public path already, or asks for the global itself
					// when the module sits at several depths.
					if (!baked && !analyzable) set.add(RuntimeGlobals.publicPath);
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!baked &&
						usesFullHash(compilation.outputOptions.webassemblyModuleFilename)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmLoadingRuntimeModule({
							generateLoadBinaryCode: baked
								? generateBakedLoadBinaryCode
								: analyzable
									? generateAnalyzableLoadBinaryCode
									: generateLoadBinaryCode,
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
					const baked = compilation.runtimeTemplate.supportsAnalyzableWasm();
					const analyzable =
						compilation.runtimeTemplate.supportsAnalyzableEsmUrl();
					// A baked URL carries the public path already, or asks for the global itself
					// when the module sits at several depths.
					if (!baked && !analyzable) set.add(RuntimeGlobals.publicPath);
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!baked &&
						usesFullHash(compilation.outputOptions.webassemblyModuleFilename)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmCompileRuntimeModule({
							generateLoadBinaryCode: baked
								? generateBakedLoadBinaryCode
								: analyzable
									? generateAnalyzableLoadBinaryCode
									: generateLoadBinaryCode,
							supportsStreaming: true
						})
					);
				});
		});
	}
}

module.exports = FetchCompileAsyncWasmPlugin;
