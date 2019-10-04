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
		const { outputOptions } = compilation;
		const fn = RuntimeGlobals.instantiateWasm;
		const chunkModuleMaps = this.compilation.chunkGraph.getChunkModuleMaps(
			chunk,
			m => m.type.startsWith("webassembly"),
			true
		);
		const wasmModuleSrcPath = compilation.getPath(
			JSON.stringify(outputOptions.webassemblyModuleFilename),
			{
				hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
				hashWithLength: length =>
					`" + ${RuntimeGlobals.getFullHash}}().slice(0, ${length}) + "`,
				module: {
					id: '" + wasmModuleId + "',
					hash: `" + ${JSON.stringify(chunkModuleMaps.hash)}[wasmModuleId] + "`,
					hashWithLength(length) {
						const shortChunkHashMap = Object.create(null);
						for (const wasmModuleId of Object.keys(chunkModuleMaps.hash)) {
							if (typeof chunkModuleMaps.hash[wasmModuleId] === "string") {
								shortChunkHashMap[wasmModuleId] = chunkModuleMaps.hash[
									wasmModuleId
								].substr(0, length);
							}
						}
						return `" + ${JSON.stringify(shortChunkHashMap)}[wasmModuleId] + "`;
					}
				}
			}
		);
		return Template.asString([
			`${fn} = function(exports, wasmModuleId, importsObj) {`,
			Template.indent([
				`var req = ${this.generateLoadBinaryCode(wasmModuleSrcPath)};`,
				this.supportsStreaming
					? Template.asString([
							"if(typeof WebAssembly.instantiateStreaming === 'function') {",
							Template.indent([
								"return WebAssembly.instantiateStreaming(req, importsObj)",
								Template.indent([
									".then(function(res) { return Object.assign(exports, res.instance.exports); });"
								])
							]),
							"}"
					  ])
					: "// no support for streaming compilation",
				"return req",
				Template.indent([
					".then(function(x) { return x.arrayBuffer(); })",
					".then(function(bytes) { return WebAssembly.instantiate(bytes, importsObj); })",
					`.then(function(res) { return Object.assign(exports, res.instance.exports); });`
				])
			]),
			"};"
		]);
	}
}

module.exports = AsyncWasmChunkLoadingRuntimeModule;
