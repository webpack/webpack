/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const chunkHasJs = require("../javascript/JavascriptModulesPlugin").chunkHasJs;
const compileBooleanMatcher = require("../util/compileBooleanMatcher");

class RequireChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("require chunk loading", 10);
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk } = this;
		const { chunkGraph } = this.compilation;
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
		const hasJsMatcher = compileBooleanMatcher(
			chunkGraph.getChunkConditionMap(chunk, chunkHasJs)
		);
		return Template.asString([
			"// object to store loaded chunks",
			'// "1" means "loaded", otherwise not loaded yet',
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			"",
			withLoading
				? Template.asString([
						"// require() chunk loading for javascript",
						`${fn}.require = function(chunkId, promises) {`,
						hasJsMatcher !== false
							? Template.indent([
									"",
									'// "1" is the signal for "already loaded"',
									"if(!installedChunks[chunkId]) {",
									Template.indent([
										hasJsMatcher === true
											? "if(true) { // all chunks have JS"
											: `if(${hasJsMatcher("chunkId")}) {`,
										Template.indent([
											`var chunk = require("./" + ${RuntimeGlobals.getChunkScriptFilename}(chunkId));`,
											"var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;",
											"for(var moduleId in moreModules) {",
											Template.indent([
												`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
												Template.indent([
													`${RuntimeGlobals.moduleFactories}[moduleId] = moreModules[moduleId];`
												]),
												"}"
											]),
											"}",
											`if(runtime) runtime(__webpack_require__);`,
											"for(var i = 0; i < chunkIds.length; i++)",
											Template.indent("installedChunks[chunkIds[i]] = 1;")
										]),
										"} else installedChunks[chunkId] = 1;",
										"",
										withHmr
											? Template.asString([
													"if(currentUpdateChunks && currentUpdateChunks[chunkId]) loadUpdateChunk(chunkId);"
											  ])
											: "// no HMR"
									]),
									"}"
							  ])
							: Template.asString([
									"installedChunks[chunkId] = 1;",
									withHmr
										? Template.asString([
												"if(currentUpdateChunks && currentUpdateChunks[chunkId]) loadUpdateChunk(chunkId);"
										  ])
										: "// no HMR"
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
							`var update = require("./" + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId));`,
							"var updatedModules = update.modules;",
							"var runtime = update.runtime;",
							"for(var moduleId in updatedModules) {",
							Template.indent([
								`if(${RuntimeGlobals.hasOwnProperty}(updatedModules, moduleId)) {`,
								Template.indent([
									`currentUpdate[moduleId] = updatedModules[moduleId];`,
									"if(updatedModulesList) updatedModulesList.push(moduleId);"
								]),
								"}"
							]),
							"}",
							"if(runtime) currentUpdateRuntime.push(runtime);"
						]),
						"}",
						"",
						`${RuntimeGlobals.hmrDownloadUpdateHandlers}.require = function(chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) {`,
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
									"loadUpdateChunk(chunkId, updatedModulesList);"
								]),
								"}",
								"currentUpdateChunks[chunkId] = true;"
							]),
							"});"
						]),
						"};"
				  ])
				: "// no HMR",
			"",
			withHmrManifest
				? Template.asString([
						`${RuntimeGlobals.hmrDownloadManifest} = function() {`,
						Template.indent([
							"return Promise.resolve().then(function() {",
							Template.indent([
								`return require("./" + ${RuntimeGlobals.getUpdateManifestFilename}());`
							]),
							'}).catch(function(err) { if(err.code !== "MODULE_NOT_FOUND") throw err; });'
						]),
						"}"
				  ])
				: "// no HMR manifest"
		]);
	}
}

module.exports = RequireChunkLoadingRuntimeModule;
