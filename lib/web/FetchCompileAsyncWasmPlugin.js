/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const { usesFullHashDigest } = require("../TemplatedPathPlugin");
const { needsRuntimeFullHash } = require("../wasm/wasmModuleFilename");
const AsyncWasmCompileRuntimeModule = require("../wasm-async/AsyncWasmCompileRuntimeModule");
const AsyncWasmLoadingRuntimeModule = require("../wasm-async/AsyncWasmLoadingRuntimeModule");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */

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
			/**
			 * A settled public path is the same string the global would hold, and `fetch`
			 * reads both against the document, so the runtime module is not needed.
			 * @param {string} constant the settled public path
			 * @returns {(path: string) => string} code to load the wasm file
			 */
			const generateConstantLoadBinaryCode = (constant) => (path) =>
				`fetch(${JSON.stringify(constant)} + ${path})`;

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
					const baked = compilation.runtimeTemplate.supportsAnalyzable(
						"wasm",
						chunkGraph,
						undefined,
						chunk.runtime
					);
					const analyzable = compilation.runtimeTemplate.supportsAnalyzable(
						"wasm-relative",
						chunkGraph
					);
					// A baked URL carries the public path already, and a settled one is written
					// out below; only a path nothing but the global knows asks for it.
					const constant =
						baked || analyzable
							? undefined
							: compilation.runtimeTemplate.constantPublicPath();
					if (!baked && !analyzable && constant === undefined) {
						set.add(RuntimeGlobals.publicPath);
					}
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!baked &&
						needsRuntimeFullHash(
							/** @type {string} */ (
								compilation.outputOptions.webassemblyModuleFilename
							)
						)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmLoadingRuntimeModule({
							fullHashDigest: usesFullHashDigest(
								/** @type {string} */ (
									compilation.outputOptions.webassemblyModuleFilename
								)
							),
							generateLoadBinaryCode: baked
								? generateBakedLoadBinaryCode
								: analyzable
									? generateAnalyzableLoadBinaryCode
									: constant === undefined
										? generateLoadBinaryCode
										: generateConstantLoadBinaryCode(constant),
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
					const baked = compilation.runtimeTemplate.supportsAnalyzable(
						"wasm",
						chunkGraph,
						undefined,
						chunk.runtime
					);
					const analyzable = compilation.runtimeTemplate.supportsAnalyzable(
						"wasm-relative",
						chunkGraph
					);
					// A baked URL carries the public path already, and a settled one is written
					// out below; only a path nothing but the global knows asks for it.
					const constant =
						baked || analyzable
							? undefined
							: compilation.runtimeTemplate.constantPublicPath();
					if (!baked && !analyzable && constant === undefined) {
						set.add(RuntimeGlobals.publicPath);
					}
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!baked &&
						needsRuntimeFullHash(
							/** @type {string} */ (
								compilation.outputOptions.webassemblyModuleFilename
							)
						)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new AsyncWasmCompileRuntimeModule({
							fullHashDigest: usesFullHashDigest(
								/** @type {string} */ (
									compilation.outputOptions.webassemblyModuleFilename
								)
							),
							generateLoadBinaryCode: baked
								? generateBakedLoadBinaryCode
								: analyzable
									? generateAnalyzableLoadBinaryCode
									: constant === undefined
										? generateLoadBinaryCode
										: generateConstantLoadBinaryCode(constant),
							supportsStreaming: true
						})
					);
				});
		});
	}
}

module.exports = FetchCompileAsyncWasmPlugin;
