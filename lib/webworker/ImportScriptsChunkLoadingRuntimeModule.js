/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ImportScriptsChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("importScripts chunk loading", 10);
		this.runtimeRequirements = runtimeRequirements;
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
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			"",
			withLoading
				? Template.asString([
						"// importScripts chunk loading",
						`${fn}.i = function(chunkId, promises) {`,
						Template.indent([
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
								`importScripts(${RuntimeGlobals.getChunkScriptFilename}(chunkId));`
							]),
							"}"
						]),
						"};"
				  ])
				: "// no chunk loading",
			"",
			withHmr
				? Template.asString([
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
						Template.getFunctionContent(
							require("../hmr/JavascriptHotModuleReplacement.runtime.js")
						)
							.replace(/\$key\$/g, "importScrips")
							.replace(/\$installedChunks\$/g, "installedChunks")
							.replace(/\$loadUpdateChunk\$/g, "loadUpdateChunk")
							.replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache)
							.replace(/\$moduleFactories\$/g, RuntimeGlobals.moduleFactories)
							.replace(
								/\$ensureChunkHandlers\$/g,
								RuntimeGlobals.ensureChunkHandlers
							)
							.replace(/\$hasOwnProperty\$/g, RuntimeGlobals.hasOwnProperty)
							.replace(/\$hmrModuleData\$/g, RuntimeGlobals.hmrModuleData)
							.replace(
								/\$hmrDownloadUpdateHandlers\$/g,
								RuntimeGlobals.hmrDownloadUpdateHandlers
							)
							.replace(
								/\$hmrInvalidateModuleHandlers\$/g,
								RuntimeGlobals.hmrInvalidateModuleHandlers
							)
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

module.exports = ImportScriptsChunkLoadingRuntimeModule;
