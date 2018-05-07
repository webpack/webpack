/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

// Get all wasm modules
function getAllWasmModules(chunk) {
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

			if (dep.module === null) {
				// Dependency was not found, an error will be thrown later
				continue;
			}

			if (usedName !== false) {
				array.push({
					exportName,
					usedName,
					module: dep.module,
					description: dep.description,
					direct: dep.onlyDirectImport
				});
			}
		}
	}
	const importsCode = [];
	const waitForPromises = new Map();
	for (const pair of depsByRequest) {
		const properties = [];
		for (const data of pair[1]) {
			if (data.direct) {
				const instanceVar = `m${waitForPromises.size}`;
				waitForPromises.set(
					instanceVar,
					`installedWasmModules[${JSON.stringify(data.module.id)}]`
				);
				properties.push(
					`${JSON.stringify(data.exportName)}: ${instanceVar}.exports` +
						`[${JSON.stringify(data.exportName)}]`
				);
			} else {
				const params = data.description.signature.params.map(
					(param, k) => "p" + k + param.valtype
				);

				const result = `__webpack_require__(${JSON.stringify(
					data.module.id
				)})[${JSON.stringify(data.usedName)}](${params})`;

				properties.push(
					Template.asString([
						`${JSON.stringify(data.exportName)}: function(${params}) {`,
						Template.indent([`return ${result};`]),
						"}"
					])
				);
			}
		}

		importsCode.push(
			Template.asString([
				`${JSON.stringify(pair[0])}: {`,
				Template.indent([properties.join(",")]),
				"}"
			])
		);
	}

	if (waitForPromises.size > 0) {
		const promises = Array.from(waitForPromises.values()).join(", ");
		const variables = Array.from(
			waitForPromises.keys(),
			(name, i) => `var ${name} = array[${i}];`
		).join("\n");
		return Template.asString([
			`${JSON.stringify(module.id)}: function() {`,
			Template.indent([
				`return Promise.resolve().then(function() { return Promise.all([${promises}]); }).then(function(array) {`,
				Template.indent([
					variables,
					"return {",
					Template.indent([importsCode.join(",")]),
					"};"
				]),
				"});"
			]),
			"},"
		]);
	} else {
		return Template.asString([
			`${JSON.stringify(module.id)}: function() {`,
			Template.indent([
				"return {",
				Template.indent([importsCode.join(",")]),
				"};"
			]),
			"},"
		]);
	}
}

class WasmMainTemplatePlugin {
	constructor(generateLoadBinaryCode, supportsStreaming) {
		this.generateLoadBinaryCode = generateLoadBinaryCode;
		this.supportsStreaming = supportsStreaming;
	}
	apply(mainTemplate) {
		mainTemplate.hooks.localVars.tap(
			"WasmMainTemplatePlugin",
			(source, chunk) => {
				const wasmModules = getAllWasmModules(chunk);
				if (wasmModules.length === 0) return source;
				const importObjects = wasmModules.map(generateImportObject);
				return Template.asString([
					source,
					"",
					"// object to store loaded and loading wasm modules",
					"var installedWasmModules = {};",
					"",
					"var wasmImportObjects = {",
					Template.indent(importObjects),
					"};"
				]);
			}
		);
		mainTemplate.hooks.requireEnsure.tap(
			"WasmMainTemplatePlugin",
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
					"// Fetch + compile chunk loading for webassembly",
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
						"if(installedWasmModuleData)",
						Template.indent(["promises.push(installedWasmModuleData);"]),
						"else {",
						Template.indent([
							`var importObject = wasmImportObjects[wasmModuleId]();`,
							`var req = ${this.generateLoadBinaryCode(wasmModuleSrcPath)};`,
							"var promise;",
							this.supportsStreaming
								? Template.asString([
										"if(importObject instanceof Promise && typeof WebAssembly.compileStreaming === 'function') {",
										Template.indent([
											"promise = Promise.all([WebAssembly.compileStreaming(req), importObject]).then(function(items) {",
											Template.indent([
												"return WebAssembly.instantiate(items[0], items[1]);"
											]),
											"});"
										]),
										"} else if(typeof WebAssembly.instantiateStreaming === 'function') {",
										Template.indent([
											"promise = WebAssembly.instantiateStreaming(req, importObject);"
										])
								  ])
								: Template.asString([
										"if(importObject instanceof Promise) {",
										Template.indent([
											"var bytesPromise = req.then(function(x) { return x.arrayBuffer(); });",
											"promise = Promise.all([",
											Template.indent([
												"bytesPromise.then(function(bytes) { return WebAssembly.compile(bytes); }),",
												"importObject"
											]),
											"]).then(function(items) {",
											Template.indent([
												"return WebAssembly.instantiate(items[0], items[1]);"
											]),
											"});"
										])
								  ]),
							"} else {",
							Template.indent([
								"var bytesPromise = req.then(function(x) { return x.arrayBuffer(); });",
								"promise = bytesPromise.then(function(bytes) {",
								Template.indent([
									"return WebAssembly.instantiate(bytes, importObject);"
								]),
								"});"
							]),
							"}",
							"promises.push(installedWasmModules[wasmModuleId] = promise.then(function(res) {",
							Template.indent([
								`return ${
									mainTemplate.requireFn
								}.w[wasmModuleId] = res.instance || res;`
							]),
							"}));"
						]),
						"}"
					]),
					"});"
				]);
			}
		);
		mainTemplate.hooks.requireExtensions.tap(
			"WasmMainTemplatePlugin",
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
		mainTemplate.hooks.hash.tap("WasmMainTemplatePlugin", hash => {
			hash.update("WasmMainTemplatePlugin");
			hash.update("1");
			hash.update(`${mainTemplate.outputOptions.webassemblyModuleFilename}`);
		});
		mainTemplate.hooks.hashForChunk.tap(
			"WasmMainTemplatePlugin",
			(hash, chunk) => {
				const chunkModuleMaps = chunk.getChunkModuleMaps(m =>
					m.type.startsWith("webassembly")
				);
				hash.update(JSON.stringify(chunkModuleMaps.id));
				const wasmModules = getAllWasmModules(chunk);
				for (const module of wasmModules) {
					hash.update(module.hash);
				}
			}
		);
	}
}

module.exports = WasmMainTemplatePlugin;
