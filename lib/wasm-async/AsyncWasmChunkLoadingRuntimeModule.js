/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class AsyncWasmChunkLoadingRuntimeModule extends RuntimeModule {
	constructor({ generateLoadBinaryCode, supportsStreaming }) {
		super("wasm chunk loading", 10);
		this.generateLoadBinaryCode = generateLoadBinaryCode;
		this.supportsStreaming = supportsStreaming;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, chunk } = this;
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

module.exports = AsyncWasmChunkLoadingRuntimeModule;
