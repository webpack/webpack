/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class ReadFileCompileWasmMainTemplatePlugin {

	apply(mainTemplate) {
		mainTemplate.plugin("local-vars", (source, chunk) => {
			return mainTemplate.asString([
				source,
				"",
				"// object to store loaded and loading wasm modules",
				"var installedWasmModules = {};",
			]);
		});
		mainTemplate.plugin("require-ensure", (source, chunk, hash) => {
			const webassemblyModuleFilename = mainTemplate.outputOptions.webassemblyModuleFilename;
			const chunkModuleMaps = chunk.getChunkModuleMaps(false, m => m.type.startsWith("webassembly"));
			if(Object.keys(chunkModuleMaps.id).length === 0) return source;
			const wasmModuleSrcPath = mainTemplate.getAssetPath(JSON.stringify(webassemblyModuleFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
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
			return mainTemplate.asString([
				source,
				"",
				"// ReadFile + compile chunk loading for webassembly",
				"",
				`var wasmModules = ${JSON.stringify(chunkModuleMaps.id)}[chunkId] || [];`,
				"",
				"wasmModules.forEach(function(wasmModuleId) {",
				mainTemplate.indent([
					"var installedWasmModuleData = installedWasmModules[wasmModuleId];",
					"",
					"// a Promise means \"currently loading\" or \"already loaded\".",
					"promises.push(installedWasmModuleData ||",
					mainTemplate.indent([
						"(installedWasmModules[wasmModuleId] = new Promise(function(resolve, reject) {",
						mainTemplate.indent([
							`require('fs').readFile(require('path').resolve(__dirname, ${wasmModuleSrcPath}), function(err, buffer) {`,
							mainTemplate.indent([
								"if(err) return reject(err);",
								"resolve(WebAssembly.compile(buffer));"
							]),
							"});"
						]),
						`}).then(function(module) { ${mainTemplate.requireFn}.w[wasmModuleId] = module; }))`
					]),
					");",
				]),
				"});",
			]);
		});
		mainTemplate.plugin("require-extensions", (source, chunk) => {
			return mainTemplate.asString([
				source,
				"",
				"// object with all compiled WebAssmbly.Modules",
				`${mainTemplate.requireFn}.w = {};`
			]);
		});
		mainTemplate.plugin("hash", hash => {
			hash.update("ReadFileCompileWasmMainTemplatePlugin");
			hash.update("1");
			hash.update(`${mainTemplate.outputOptions.webassemblyModuleFilename}`);
		});
	}
}
module.exports = ReadFileCompileWasmMainTemplatePlugin;
