/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class ReadFileCompileWasmMainTemplatePlugin {
	apply(mainTemplate) {
		mainTemplate.hooks.localVars.tap(
			"ReadFileCompileWasmMainTemplatePlugin",
			(source, chunk) => {
				return Template.asString([
					source,
					"",
					"// object to store loaded and loading wasm modules",
					"var installedWasmModules = {};"
				]);
			}
		);
		mainTemplate.hooks.requireEnsure.tap(
			"ReadFileCompileWasmMainTemplatePlugin",
			(source, chunk, hash) => {
				const webassemblyModuleFilename =
					mainTemplate.outputOptions.webassemblyModuleFilename;
				const chunkModuleMaps = chunk.getChunkModuleMaps(m =>
					m.type.startsWith("webassembly")
				);
				if (Object.keys(chunkModuleMaps.id).length === 0) return source;
				const wasmModuleSrcPath = mainTemplate.getAssetPath(
					JSON.stringify(webassemblyModuleFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
						module: {
							id: '" + wasmModuleId + "',
							hash: `" + ${JSON.stringify(
								chunkModuleMaps.hash
							)}[wasmModuleId] + "`,
							hashWithLength(length) {
								const shortChunkHashMap = Object.create(null);
								for (const wasmModuleId of Object.keys(chunkModuleMaps.hash)) {
									if (typeof chunkModuleMaps.hash[wasmModuleId] === "string")
										shortChunkHashMap[wasmModuleId] = chunkModuleMaps.hash[
											wasmModuleId
										].substr(0, length);
								}
								return `" + ${JSON.stringify(
									shortChunkHashMap
								)}[wasmModuleId] + "`;
							}
						}
					}
				);
				return Template.asString([
					source,
					"",
					"// ReadFile + compile chunk loading for webassembly",
					"",
					`var wasmModules = ${JSON.stringify(
						chunkModuleMaps.id
					)}[chunkId] || [];`,
					"",
					"wasmModules.forEach(function(wasmModuleId) {",
					Template.indent([
						"var installedWasmModuleData = installedWasmModules[wasmModuleId];",
						"",
						'// a Promise means "currently loading" or "already loaded".',
						"promises.push(installedWasmModuleData ||",
						Template.indent([
							"(installedWasmModules[wasmModuleId] = new Promise(function(resolve, reject) {",
							Template.indent([
								`require('fs').readFile(require('path').resolve(__dirname, ${
									wasmModuleSrcPath
								}), function(err, buffer) {`,
								Template.indent([
									"if(err) return reject(err);",
									"resolve(WebAssembly.compile(buffer));"
								]),
								"});"
							]),
							`}).then(function(module) { ${
								mainTemplate.requireFn
							}.w[wasmModuleId] = module; }))`
						]),
						");"
					]),
					"});"
				]);
			}
		);
		mainTemplate.hooks.requireExtensions.tap(
			"ReadFileCompileWasmMainTemplatePlugin",
			(source, chunk) => {
				return Template.asString([
					source,
					"",
					"// object with all compiled WebAssmbly.Modules",
					`${mainTemplate.requireFn}.w = {};`
				]);
			}
		);
		mainTemplate.hooks.hash.tap(
			"ReadFileCompileWasmMainTemplatePlugin",
			hash => {
				hash.update("ReadFileCompileWasmMainTemplatePlugin");
				hash.update("1");
				hash.update(`${mainTemplate.outputOptions.webassemblyModuleFilename}`);
			}
		);
	}
}
module.exports = ReadFileCompileWasmMainTemplatePlugin;
