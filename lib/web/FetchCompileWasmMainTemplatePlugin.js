/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

class FetchCompileWasmMainTemplatePlugin {
	apply(mainTemplate) {
		mainTemplate.hooks.localVars.tap(
			"FetchCompileWasmMainTemplatePlugin",
			(source, chunk) => {
				if (!chunk.hasModuleInGraph(m => m.type.startsWith("webassembly")))
					return source;
				return Template.asString([
					source,
					"",
					"// object to store loaded and loading wasm modules",
					"var installedWasmModules = {};"
				]);
			}
		);
		mainTemplate.hooks.requireEnsure.tap(
			"FetchCompileWasmMainTemplatePlugin",
			(source, chunk, hash) => {
				const webassemblyModuleFilename =
					mainTemplate.outputOptions.webassemblyModuleFilename;

				// Get all wasm modules
				function getAllWasmModules() {
					const wasmModules = chunk.getAllAsyncChunks();
					const array = [];
					for (const chunk of wasmModules) {
						for (const m of chunk.modulesIterable) {
							if (m.type.startsWith("webassembly")) {
								array.push(m);
							}
						}
					}

					return array;
				}

				function generateImportObject(module) {
					const depsByRequest = new Map();
					for (const dep of module.dependencies) {
						if (dep instanceof WebAssemblyImportDependency) {
							// Ignore global they will be handled later
							if (dep.description.type === "GlobalType") {
								continue;
							}

							const request = dep.request;
							let array = depsByRequest.get(request);
							if (!array) {
								depsByRequest.set(request, (array = []));
							}
							const exportName = dep.name;
							const usedName = dep.module && dep.module.isUsed(exportName);
							array.push({
								exportName,
								usedName,
								module: dep.module,
								description: dep.description
							});
						}
					}
					const importsCode = [];
					for (const pair of depsByRequest) {
						const properties = [];
						for (const data of pair[1]) {
							let params = "";
							let result = "void 0";

							if (data.description.type === "FuncImportDescr") {
								params = data.description.params.map(
									(param, k) => "p" + k + param.valtype
								);

								result = `__webpack_require__(${JSON.stringify(
									data.module.id
								)})[${JSON.stringify(data.usedName)}](${params})`;
							}

							properties.push(
								`\n\t\t${JSON.stringify(data.exportName)}: function(${params}) {
                                  return ${result};
                                }`
							);
						}
						importsCode.push(
							`\n\t${JSON.stringify(pair[0])}: {${properties.join(",")}\n\t}`
						);
					}

					return (
						JSON.stringify(module.id) + ": {" + importsCode.join(",") + "\n},"
					);
				}

				const wasmModules = getAllWasmModules();
				const importObjects = wasmModules.map(generateImportObject);

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
					"// Fetch + compile chunk loading for webassembly",
					"",
					"var importObjects = {",
					Template.indent([importObjects]),
					"}",
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
						Template.indent([
							`var importObject = importObjects[wasmModuleId]`,
							`var req = fetch(${mainTemplate.requireFn}.p + ${
								wasmModuleSrcPath
							})`,
							"if(WebAssembly.instantiateStreaming) {",
							Template.indent([
								"promises.push(WebAssembly.instantiateStreaming(req, importObject)",
								`.then(function(res) { ${
									mainTemplate.requireFn
								}.w[wasmModuleId] = installedWasmModules[wasmModuleId] = res.instance;`,
								"}))"
							]),
							"} else {",
							Template.indent([
								// FIXME(sven): ensrue this still works / change it
								"promises.push(response.arrayBuffer().then(function(bytes) { installedWasmModules[wasmModuleId] = WebAssembly.compile(bytes); }));"
							]),
							"}"
						])
					]),
					"});"
				]);
			}
		);
		mainTemplate.hooks.requireExtensions.tap(
			"FetchCompileWasmMainTemplatePlugin",
			(source, chunk) => {
				if (!chunk.hasModuleInGraph(m => m.type.startsWith("webassembly")))
					return source;
				return Template.asString([
					source,
					"",
					"// object with all WebAssembly.instance",
					`${mainTemplate.requireFn}.w = {};`
				]);
			}
		);
		mainTemplate.hooks.hash.tap("FetchCompileWasmMainTemplatePlugin", hash => {
			hash.update("FetchCompileWasmMainTemplatePlugin");
			hash.update("1");
			hash.update(`${mainTemplate.outputOptions.webassemblyModuleFilename}`);
		});
	}
}
module.exports = FetchCompileWasmMainTemplatePlugin;
