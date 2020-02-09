/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class WebWorkerChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements, options) {
		super("webworker chunk loading", 10);
		options = options || {};
		this.runtimeRequirements = runtimeRequirements;
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			chunk,
			compilation: {
				outputOptions: { globalObject, chunkCallbackName, hotUpdateFunction }
			}
		} = this;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withLoading = this.runtimeRequirements.has(
			RuntimeGlobals.ensureChunkHandlers
		);
		const withHmr = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const withHmrManifest = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadManifest
		);
		return Template.asString([
			"// object to store loaded chunks",
			'// "1" means "already loaded"',
			...(this.asyncChunkLoading ? ["// Promise meaning loading started"] : []),
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			...(this.asyncChunkLoading
				? [
						"",
						"// object to store chunk callbacks",
						`${globalObject}[${JSON.stringify(
							chunkCallbackName
						)}] = ${globalObject}[${JSON.stringify(chunkCallbackName)}] || {};`
				  ]
				: []),
			"",
			withLoading
				? Template.asString([
						`// ${
							this.asyncChunkLoading ? "fetch" : "importScripts"
						} chunk loading`,
						`${fn}.i = function(chunkId, promises) {`,
						Template.indent(
							this.asyncChunkLoading
								? [
										'// "1" is the signal for "already loaded"',
										"if(installedChunks[chunkId] === 1) return;",
										'// "Promise" is the signal for "already loading"',
										"if(installedChunks[chunkId] instanceof Promise) promises.push(installedChunks[chunkId]);",
										"if(!installedChunks[chunkId]) {",
										Template.indent([
											"promises.push(installedChunks[chunkId] = new Promise(function(resolve, reject) {",
											Template.indent([
												`${globalObject}[${JSON.stringify(
													chunkCallbackName
												)}][chunkId] = function webpackChunkCallback(chunkIds, moreModules, runtime) {`,
												Template.indent([
													"for(var moduleId in moreModules) {",
													Template.indent([
														`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
														Template.indent(
															`${RuntimeGlobals.moduleFactories}[moduleId] = moreModules[moduleId];`
														),
														"}"
													]),
													"}",
													"if(runtime) runtime(__webpack_require__);",
													"while(chunkIds.length)",
													Template.indent(
														"installedChunks[chunkIds.pop()] = 1;"
													),
													"",
													`delete ${globalObject}[${JSON.stringify(
														chunkCallbackName
													)}][chunkId];`,
													"resolve();"
												]),
												"};",
												`fetch(${RuntimeGlobals.getChunkScriptFilename}(chunkId))`,
												Template.indent([
													".then(function(resp) {",
													Template.indent("return resp.text();"),
													"})",
													".then(function(moduleContent) {",
													Template.indent("Function(moduleContent)();"),
													"})",
													".catch(reject);"
												]),
												"",
												withHmr
													? "if(currentUpdateChunks && currentUpdateChunks[chunkId]) loadUpdateChunk(chunkId);"
													: "// no HMR"
											]),
											"}));"
										]),
										"}"
								  ]
								: [
										'// "1" is the signal for "already loaded"',
										"if(!installedChunks[chunkId]) {",
										Template.indent([
											`${globalObject}[${JSON.stringify(
												chunkCallbackName
											)}] = function webpackChunkCallback(chunkIds, moreModules, runtime) {`,
											Template.indent([
												"for(var moduleId in moreModules) {",
												Template.indent([
													`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
													Template.indent(
														`${RuntimeGlobals.moduleFactories}[moduleId] = moreModules[moduleId];`
													),
													"}"
												]),
												"}",
												"if(runtime) runtime(__webpack_require__);",
												"while(chunkIds.length)",
												Template.indent("installedChunks[chunkIds.pop()] = 1;")
											]),
											"};",
											`importScripts(${RuntimeGlobals.getChunkScriptFilename}(chunkId));`,
											"",
											withHmr
												? "if(currentUpdateChunks && currentUpdateChunks[chunkId]) loadUpdateChunk(chunkId);"
												: "// no HMR"
										]),
										"}"
								  ]
						),
						"};"
				  ])
				: "// no chunk loading",
			"",
			withHmr
				? Template.asString([
						"var currentUpdateChunks;",
						"var currentUpdate;",
						"var currentUpdateRuntime;",
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							"var success = false;",
							`${globalObject}[${JSON.stringify(
								hotUpdateFunction
							)}] = function(moreModules, runtime) {`,
							Template.indent([
								"for(var moduleId in moreModules) {",
								Template.indent([
									`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
									Template.indent([
										"currentUpdate[moduleId] = moreModules[moduleId];",
										"if(updatedModulesList) updatedModulesList.push(moduleId);"
									]),
									"}"
								]),
								"}",
								"if(runtime) currentUpdateRuntime.push(runtime);",
								"success = true;"
							]),
							"};",
							"// start update chunk loading",
							`importScripts(${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId));`,
							'if(!success) throw new Error("Loading update chunk failed for unknown reason");'
						]),
						"}",
						"",
						`${RuntimeGlobals.hmrDownloadUpdateHandlers}.jsonp = function(chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) {`,
						Template.indent([
							"applyHandlers.push(function(options) {",
							Template.indent([
								"currentUpdateChunks = undefined;",
								Template.getFunctionContent(
									require("../hmr/JavascriptHotModuleReplacement.runtime.js")
								)
									.replace(/\$options\$/g, "options")
									.replace(/\$updateModuleFactories\$/g, "currentUpdate")
									.replace(/\$updateRuntimeModules\$/g, "currentUpdateRuntime")
									.replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache)
									.replace(/\$hmrModuleData\$/g, RuntimeGlobals.hmrModuleData)
									.replace(
										/\$moduleFactories\$/g,
										RuntimeGlobals.moduleFactories
									)
									.replace(
										/\/\/ \$dispose\$/g,
										Template.asString([
											"removedChunks.forEach(function(chunkId) { delete installedChunks[chunkId]; });"
										])
									)
							]),
							"});",
							"currentUpdateChunks = {};",
							"currentUpdate = removedModules.reduce(function(obj, key) { obj[key] = false; return obj; }, {});",
							"currentUpdateRuntime = [];",
							"chunkIds.forEach(function(chunkId) {",
							Template.indent([
								"if(installedChunks[chunkId] !== undefined) {",
								Template.indent([
									"promises.push(loadUpdateChunk(chunkId, updatedModulesList));"
								]),
								"}",
								"currentUpdateChunks[chunkId] = true;"
							]),
							"});"
						]),
						"}"
				  ])
				: "// no HMR",
			"",
			withHmrManifest
				? Template.asString([
						`${RuntimeGlobals.hmrDownloadManifest} = function() {`,
						Template.indent([
							'if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");',
							`return fetch(${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getUpdateManifestFilename}()).then(function(response) {`,
							Template.indent([
								"if(response.status === 404) return; // no update available",
								'if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);',
								"return response.json();"
							]),
							"});"
						]),
						"};"
				  ])
				: "// no HMR manifest"
		]);
	}
}

module.exports = WebWorkerChunkLoadingRuntimeModule;
