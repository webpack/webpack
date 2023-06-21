/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

/**
 * @typedef {Object} AsyncWasmLoadingRuntimeModuleOptions
 * @property {function(string): string} generateLoadBinaryCode
 * @property {boolean} supportsStreaming
 */

class AsyncWasmLoadingRuntimeModule extends RuntimeModule {
	/**
	 * @param {AsyncWasmLoadingRuntimeModuleOptions} options options
	 */
	constructor({ generateLoadBinaryCode, supportsStreaming }) {
		super("wasm loading", RuntimeModule.STAGE_NORMAL);
		this.generateLoadBinaryCode = generateLoadBinaryCode;
		this.supportsStreaming = supportsStreaming;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const { outputOptions, runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.instantiateWasm;
		const wasmModuleSrcPath = compilation.getPath(
			JSON.stringify(outputOptions.webassemblyModuleFilename),
			{
				hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
				hashWithLength: length =>
					`" + ${RuntimeGlobals.getFullHash}}().slice(0, ${length}) + "`,
				module: {
					id: '" + wasmModuleId + "',
					hash: `" + wasmModuleHash + "`,
					hashWithLength(length) {
						return `" + wasmModuleHash.slice(0, ${length}) + "`;
					}
				},
				runtime: chunk.runtime
			}
		);
		return `${fn} = ${runtimeTemplate.basicFunction(
			"exports, wasmModuleId, wasmModuleHash, importsObj",
			[
				`var req = ${this.generateLoadBinaryCode(wasmModuleSrcPath)};`,
				this.supportsStreaming
					? Template.asString([
							"if (typeof WebAssembly.instantiateStreaming === 'function') {",
							Template.indent([
								"return WebAssembly.instantiateStreaming(req, importsObj)",
								Template.indent([
									`.then(${runtimeTemplate.returningFunction(
										"Object.assign(exports, res.instance.exports)",
										"res"
									)});`
								])
							]),
							"}"
					  ])
					: "// no support for streaming compilation",
				"return req",
				Template.indent([
					`.then(${runtimeTemplate.returningFunction("x.arrayBuffer()", "x")})`,
					`.then(${runtimeTemplate.returningFunction(
						"WebAssembly.instantiate(bytes, importsObj)",
						"bytes"
					)})`,
					`.then(${runtimeTemplate.returningFunction(
						"Object.assign(exports, res.instance.exports)",
						"res"
					)});`
				])
			]
		)};`;
	}
}

module.exports = AsyncWasmLoadingRuntimeModule;
