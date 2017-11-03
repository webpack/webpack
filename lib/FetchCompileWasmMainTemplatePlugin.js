/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FetchCompileWasmMainTemplatePlugin {

	apply(mainTemplate) {
		mainTemplate.plugin("local-vars", function(source, chunk) {
			return this.asString([
				source,
				"",
				"// object to store loaded and loading wasm modules",
				"var installedWasmModules = {};",
			]);
		});
		mainTemplate.plugin("require-ensure", function(source, chunk, hash) {
			const webassemblyModuleFilename = this.outputOptions.webassemblyModuleFilename;
			const chunkModuleMaps = chunk.getChunkModuleMaps(false, m => m.type.startsWith("webassembly"));
			if(Object.keys(chunkModuleMaps.id).length === 0) return source;
			const wasmModuleSrcPath = this.applyPluginsWaterfall("asset-path", JSON.stringify(webassemblyModuleFilename), {
				hash: `" + ${this.renderCurrentHashCode(hash)} + "`,
				hashWithLength: length => `" + ${this.renderCurrentHashCode(hash, length)} + "`,
				module: {
					id: "\" + wasmModuleId + \"",
					hash: `" + ${JSON.stringify(chunkModuleMaps.hash)}[wasmModuleId] + "`,
					hashWithLength(length) {
						const shortChunkHashMap = Object.create(null);
						Object.keys(chunkModuleMaps.hash).forEach(wasmModuleId => {
							if(typeof chunkModuleMaps.hash[wasmModuleId] === "string")
								shortChunkHashMap[wasmModuleId] = chunkModuleMaps.hash[wasmModuleId].substr(0, length);
						});
						return `" + ${JSON.stringify(shortChunkHashMap)}[wasmModuleId] + "`;
					}
				}
			});
			return this.asString([
				source,
				"",
				"// Fetch + compile chunk loading for webassembly",
				"",
				`var wasmModules = ${JSON.stringify(chunkModuleMaps.id)}[chunkId] || [];`,
				"",
				"wasmModules.forEach(function(wasmModuleId) {",
				this.indent([
					"var installedWasmModuleData = installedWasmModules[wasmModuleId];",
					"",
					"// a Promise means \"currently loading\" or \"already loaded\".",
					"promises.push(installedWasmModuleData ||",
					this.indent([
						`promises.push(installedWasmModules[wasmModuleId] = fetch(${this.requireFn}.p + ${wasmModuleSrcPath}).then(function(response) {`,
						this.indent([
							"if(WebAssembly.compileStreaming) {",
							this.indent([
								"return WebAssembly.compileStreaming(response);"
							]),
							"} else {",
							this.indent([
								"return response.arrayBuffer().then(function(bytes) { return WebAssembly.compile(bytes); });",
							]),
							"}"
						]),
						`}).then(function(module) { ${this.requireFn}.w[wasmModuleId] = module; }))`
					]),
					");",
				]),
				"});",
			]);
		});
		mainTemplate.plugin("require-extensions", function(source, chunk) {
			return this.asString([
				source,
				"",
				"// object with all compiled WebAssmbly.Modules",
				`${this.requireFn}.w = {};`
			]);
		});
		mainTemplate.plugin("hash", function(hash) {
			hash.update("jsonp");
			hash.update("5");
			hash.update(`${this.outputOptions.filename}`);
			hash.update(`${this.outputOptions.chunkFilename}`);
			hash.update(`${this.outputOptions.jsonpFunction}`);
			hash.update(`${this.outputOptions.hotUpdateFunction}`);
		});
	}
}
module.exports = FetchCompileWasmMainTemplatePlugin;
