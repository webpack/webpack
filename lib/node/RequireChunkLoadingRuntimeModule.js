/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	chunkHasJs,
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const { getUndoPath } = require("../util/identifier");

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
		const { chunkGraph, runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withExternalInstallChunk = this.runtimeRequirements.has(
			RuntimeGlobals.externalInstallChunk
		);
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

		const outputName = this.compilation.getPath(
			getChunkFilenameTemplate(chunk, this.compilation.outputOptions),
			{
				chunk,
				contentHashType: "javascript"
			}
		);
		const rootOutputDir = getUndoPath(outputName, true);

		return Template.asString([
			"// object to store loaded chunks",
			'// "1" means "loaded", otherwise not loaded yet',
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			"",
			withLoading || withExternalInstallChunk
				? `var installChunk = ${runtimeTemplate.basicFunction("chunk", [
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
				  ])};`
				: "// no chunk install function needed",
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
											`installChunk(require(${JSON.stringify(
												rootOutputDir
											)} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId)));`
										]),
										"} else installedChunks[chunkId] = 1;",
										""
									]),
									"}"
							  ])
							: "installedChunks[chunkId] = 1;",
						"};"
				  ])
				: "// no chunk loading",
			"",
			withExternalInstallChunk
				? Template.asString([
						"module.exports = __webpack_require__;",
						`${RuntimeGlobals.externalInstallChunk} = installChunk;`
				  ])
				: "// no external install chunk",
			"",
			withHmr
				? Template.asString([
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							`var update = require(${JSON.stringify(rootOutputDir)} + ${
								RuntimeGlobals.getChunkUpdateScriptFilename
							}(chunkId));`,
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
						Template.getFunctionContent(
							require("../hmr/JavascriptHotModuleReplacement.runtime.js")
						)
							.replace(/\$key\$/g, "require")
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
							"return Promise.resolve().then(function() {",
							Template.indent([
								`return require(${JSON.stringify(rootOutputDir)} + ${
									RuntimeGlobals.getUpdateManifestFilename
								}());`
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
