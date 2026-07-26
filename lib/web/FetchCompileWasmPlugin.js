/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_SYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const { getPresentKinds } = require("../TemplatedPathPlugin");
const WasmChunkLoadingRuntimeModule = require("../wasm-sync/WasmChunkLoadingRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * The wasm runtime inlines `[fullhash]` as a runtime `getFullHash()` call, so
 * that runtime module must be requested (`[hash]` is the per-module hash here).
 * @param {string} filename `output.webassemblyModuleFilename`
 * @returns {boolean} whether it references the compilation `[fullhash]`
 */
const usesFullHash = (filename) => getPresentKinds(filename).has("fullhash");

/**
 * Options that influence how synchronous WebAssembly modules are emitted for
 * the fetch-based wasm loading runtime.
 * @typedef {object} FetchCompileWasmPluginOptions
 * @property {boolean=} mangleImports mangle imports
 */

const PLUGIN_NAME = "FetchCompileWasmPlugin";

/**
 * Enables synchronous WebAssembly chunk loading that fetches `.wasm` files and
 * compiles them in browser-like environments.
 */
class FetchCompileWasmPlugin {
	/**
	 * Stores options that affect generated synchronous WebAssembly runtime code.
	 * @param {FetchCompileWasmPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {FetchCompileWasmPluginOptions} */
		this.options = options;
	}

	/**
	 * Registers compilation hooks that attach the fetch-based synchronous wasm
	 * runtime module to chunks containing sync WebAssembly modules.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalWasmLoading = compilation.outputOptions.wasmLoading;
			/**
			 * Determines whether the chunk should load synchronous WebAssembly
			 * binaries through the `fetch` backend.
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
				`fetch(new URL(${path}, ${compilation.outputOptions.importMetaName}.url))`;

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
					if (!isEnabledForChunk(chunk)) return;
					if (
						!chunkGraph.hasModuleInGraph(
							chunk,
							(m) => m.type === WEBASSEMBLY_MODULE_TYPE_SYNC
						)
					) {
						return;
					}
					set.add(RuntimeGlobals.moduleCache);
					const analyzable =
						compilation.runtimeTemplate.supportsAnalyzableEsmUrl();
					if (!analyzable) set.add(RuntimeGlobals.publicPath);
					if (
						usesFullHash(compilation.outputOptions.webassemblyModuleFilename)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new WasmChunkLoadingRuntimeModule({
							generateLoadBinaryCode: analyzable
								? generateAnalyzableLoadBinaryCode
								: generateLoadBinaryCode,
							supportsStreaming: true,
							mangleImports: this.options.mangleImports,
							runtimeRequirements: set
						})
					);
				});
		});
	}
}

module.exports = FetchCompileWasmPlugin;
