/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { usesFullHashDigest } = require("../TemplatedPathPlugin");
const { needsRuntimeFullHash } = require("../wasm/wasmModuleFilename");
const AsyncWasmCompileRuntimeModule = require("../wasm-async/AsyncWasmCompileRuntimeModule");
const AsyncWasmLoadingRuntimeModule = require("../wasm-async/AsyncWasmLoadingRuntimeModule");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import { RuntimeSpec } from "../util/runtime" */

/**
 * Defines the read file compile async wasm plugin options type used by this module.
 * @typedef {object} ReadFileCompileAsyncWasmPluginOptions
 * @property {boolean=} import use import?
 */

const PLUGIN_NAME = "ReadFileCompileAsyncWasmPlugin";

class ReadFileCompileAsyncWasmPlugin {
	/**
	 * Creates an instance of ReadFileCompileAsyncWasmPlugin.
	 * @param {ReadFileCompileAsyncWasmPluginOptions=} options options object
	 */
	constructor({ import: useImport = false } = {}) {
		/** @type {boolean} */
		this._import = useImport;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const globalWasmLoading = compilation.outputOptions.wasmLoading;
			/**
			 * Checks whether this read file compile async wasm plugin is enabled for chunk.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, if wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const wasmLoading =
					options && options.wasmLoading !== undefined
						? options.wasmLoading
						: globalWasmLoading;
				return wasmLoading === "async-node";
			};

			// The call site already passes a complete `URL` when it bakes one, and `readFile`
			// takes one as-is. Read that per call: it depends on parse results, so it is not
			// settled while the plugin is being applied.
			/**
			 * @param {string} path rendered path to the wasm file
			 * @param {boolean} analyzable whether the call site bakes a complete URL
			 * @returns {string} the argument to hand the reader
			 */
			const wasmUrlArg = (path, analyzable) =>
				analyzable ? path : compilation.runtimeTemplate.importMetaUrl(path);
			/**
			 * @type {(path: string, runtime: RuntimeSpec, analyzable: boolean) => string} callback to generate code to load the wasm file
			 */
			const generateLoadBinaryCode = this._import
				? (path, runtime, analyzable) =>
						Template.asString([
							"Promise.all([import('fs'), import('url')]).then(([{ readFile }, { URL }]) => new Promise((resolve, reject) => {",
							Template.indent([
								`readFile(${wasmUrlArg(path, analyzable)}, (err, buffer) => {`,
								Template.indent([
									"if (err) return reject(err);",
									"",
									"// Fake fetch response",
									"resolve({",
									Template.indent([
										// Return a real ArrayBuffer: some runtimes (e.g. Deno)
										// reject a Node Buffer view here as "not a buffer source".
										"arrayBuffer() { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }"
									]),
									"});"
								]),
								"});"
							]),
							"}))"
						])
				: (path) =>
						Template.asString([
							"new Promise(function (resolve, reject) {",
							Template.indent([
								"try {",
								Template.indent([
									compilation.runtimeTemplate.destructureObject(
										["readFile"],
										`require(${compilation.runtimeTemplate.renderNodePrefixForCoreModule("fs")})`
									),
									compilation.runtimeTemplate.destructureObject(
										["join"],
										`require(${compilation.runtimeTemplate.renderNodePrefixForCoreModule("path")})`
									),
									"",
									`readFile(join(__dirname, ${path}), function(err, buffer){`,
									Template.indent([
										"if (err) return reject(err);",
										"",
										"// Fake fetch response",
										"resolve({",
										Template.indent([
											// Return a real ArrayBuffer: some runtimes (e.g. Deno)
											// reject a Node Buffer view here as "not a buffer source".
											compilation.runtimeTemplate.method(
												"arrayBuffer",
												"",
												"return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);"
											)
										]),
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
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!compilation.runtimeTemplate.supportsAnalyzable(
							"wasm",
							chunkGraph,
							undefined,
							chunk.runtime
						) &&
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
							generateLoadBinaryCode,
							supportsStreaming: false
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
					// A baked URL is already a literal, so nothing interpolates the name.
					if (
						!compilation.runtimeTemplate.supportsAnalyzable(
							"wasm",
							chunkGraph,
							undefined,
							chunk.runtime
						) &&
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
							generateLoadBinaryCode,
							supportsStreaming: false
						})
					);
				});
		});
	}
}

module.exports = ReadFileCompileAsyncWasmPlugin;
