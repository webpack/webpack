/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ImportScriptsChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(chunk, outputOptions, runtimeRequirements) {
		super("importScripts chunk loading", 10);
		this.chunk = chunk;
		this.outputOptions = outputOptions;
		this.runtimeRequirements = runtimeRequirements;
		this.shouldCheckEnvironment = runtimeRequirements.has(
			RuntimeGlobals.environment
		);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk, outputOptions, shouldCheckEnvironment } = this;
		const { globalObject, chunkCallbackName } = outputOptions;
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
		const runtimeCodeLines = [
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
										"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
										Template.indent(
											`${
												RuntimeGlobals.moduleFactories
											}[moduleId] = moreModules[moduleId];`
										),
										"}"
									]),
									"}",
									"if(runtime) runtime(__webpack_require__);",
									"while(chunkIds.length)",
									Template.indent("installedChunks[chunkIds.pop()] = 1;")
								]),
								"};",
								`importScripts(${
									RuntimeGlobals.getChunkScriptFilename
								}(chunkId));`,
								"",
								withHmr
									? "if(currentUpdateChunks && currentUpdateChunks[chunkId]) loadUpdateChunk(chunkId);"
									: "// no HMR"
							]),
							"}"
						]),
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
							`${outputOptions.globalObject}[${JSON.stringify(
								outputOptions.hotUpdateFunction
							)}] = function(moreModules, runtime) {`,
							Template.indent([
								"for(var moduleId in moreModules) {",
								Template.indent([
									"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
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
							`importScripts(${RuntimeGlobals.publicPath} + ${
								RuntimeGlobals.getChunkUpdateScriptFilename
							}(chunkId));`,
							'if(!success) throw new Error("Loading update chunk failed for unknown reason");'
						]),
						"}",
						"",
						`${
							RuntimeGlobals.hmrDownloadUpdateHandlers
						}.jsonp = function(chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) {`,
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
							`return fetch(${RuntimeGlobals.publicPath} + ${
								RuntimeGlobals.getUpdateManifestFilename
							}()).then(function(response) {`,
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
		];

		return shouldCheckEnvironment
			? Template.asString([
					`if(${RuntimeGlobals.environment} === "webworker") {`,
					Template.indent(runtimeCodeLines),
					"}"
			  ])
			: Template.asString(runtimeCodeLines);
	}
}

module.exports = ImportScriptsChunkLoadingRuntimeModule;
