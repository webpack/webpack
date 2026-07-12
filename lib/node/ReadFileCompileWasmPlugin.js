/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { WEBASSEMBLY_MODULE_TYPE_SYNC } from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import WasmChunkLoadingRuntimeModule from "../wasm-sync/WasmChunkLoadingRuntimeModule.js";
/** @typedef {import("../Chunk.js").default} Chunk */
/** @typedef {import("../Compiler.js").default} Compiler */

/**
 * Defines the read file compile wasm plugin options type used by this module.
 * @typedef {object} ReadFileCompileWasmPluginOptions
 * @property {boolean=} mangleImports mangle imports
 * @property {boolean=} import use import?
 */

const PLUGIN_NAME = "ReadFileCompileWasmPlugin";

class ReadFileCompileWasmPlugin {
	/**
	 * Creates an instance of ReadFileCompileWasmPlugin.
	 * @param {ReadFileCompileWasmPluginOptions=} options options object
	 */
	constructor(options = {}) {
		/** @type {ReadFileCompileWasmPluginOptions} */
		this.options = options;
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
			 * Checks whether this read file compile wasm plugin is enabled for chunk.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, when wasm loading is enabled for the chunk
			 */
			const isEnabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const wasmLoading =
					options && options.wasmLoading !== undefined
						? options.wasmLoading
						: globalWasmLoading;
				return wasmLoading === "async-node";
			};

			/**
			 * @type {(path: string) => string} callback to generate code to load the wasm file
			 */
			const generateLoadBinaryCode = this.options.import
				? (path) =>
						Template.asString([
							"Promise.all([import('fs'), import('url')]).then(([{ readFile }, { URL }]) => new Promise((resolve, reject) => {",
							Template.indent([
								`readFile(new URL(${path}, ${compilation.outputOptions.importMetaName}.url), (err, buffer) => {`,
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
				: (path) =>
						Template.asString([
							"new Promise(function (resolve, reject) {",
							Template.indent([
								`var { readFile } = require(${compilation.runtimeTemplate.renderNodePrefixForCoreModule("fs")});`,
								`var { join } = require(${compilation.runtimeTemplate.renderNodePrefixForCoreModule("path")});`,
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
					compilation.addRuntimeModule(
						chunk,
						new WasmChunkLoadingRuntimeModule({
							generateLoadBinaryCode,
							supportsStreaming: false,
							mangleImports: this.options.mangleImports,
							runtimeRequirements: set
						})
					);
				});
		});
	}
}

export default ReadFileCompileWasmPlugin;

export { ReadFileCompileWasmPlugin as "module.exports" };
