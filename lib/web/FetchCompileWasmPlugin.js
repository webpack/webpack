/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_SYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const { usesFullHashDigest } = require("../TemplatedPathPlugin");
const { needsRuntimeFullHash } = require("../wasm/wasmModuleFilename");
const WasmChunkLoadingRuntimeModule = require("../wasm-sync/WasmChunkLoadingRuntimeModule");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */

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
				`fetch(${compilation.runtimeTemplate.importMetaUrl(path)})`;
			/**
			 * A public path that never changes is the same string the global would hold,
			 * so it is inlined and the runtime module that sets it is not needed.
			 * @param {string} constant the settled public path
			 * @returns {(path: string) => string} code to load the wasm file
			 */
			const generateConstantLoadBinaryCode = (constant) => (path) =>
				`fetch(${JSON.stringify(constant)} + ${path})`;

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
					const analyzable = compilation.runtimeTemplate.supportsAnalyzable(
						"wasm-relative",
						chunkGraph
					);
					const constant = analyzable
						? undefined
						: compilation.runtimeTemplate.constantPublicPath();
					if (!analyzable && constant === undefined) {
						set.add(RuntimeGlobals.publicPath);
					}
					if (
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
						new WasmChunkLoadingRuntimeModule({
							fullHashDigest: usesFullHashDigest(
								/** @type {string} */ (
									compilation.outputOptions.webassemblyModuleFilename
								)
							),
							generateLoadBinaryCode: analyzable
								? generateAnalyzableLoadBinaryCode
								: constant === undefined
									? generateLoadBinaryCode
									: generateConstantLoadBinaryCode(constant),
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
