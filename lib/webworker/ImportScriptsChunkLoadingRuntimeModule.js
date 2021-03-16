/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	getChunkFilenameTemplate,
	chunkHasJs
} = require("../javascript/JavascriptModulesPlugin");
const { getInitialChunkIds } = require("../javascript/StartupHelpers");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const { getUndoPath } = require("../util/identifier");

class ImportScriptsChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("importScripts chunk loading", RuntimeModule.STAGE_ATTACH);
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			chunk,
			compilation: {
				chunkGraph,
				runtimeTemplate,
				outputOptions: { globalObject, chunkLoadingGlobal, hotUpdateGlobal }
			}
		} = this;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withBaseURI = this.runtimeRequirements.has(RuntimeGlobals.baseURI);
		const withLoading = this.runtimeRequirements.has(
			RuntimeGlobals.ensureChunkHandlers
		);
		const withHmr = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const withHmrManifest = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadManifest
		);
		const chunkLoadingGlobalExpr = `${globalObject}[${JSON.stringify(
			chunkLoadingGlobal
		)}]`;
		const hasJsMatcher = compileBooleanMatcher(
			chunkGraph.getChunkConditionMap(chunk, chunkHasJs)
		);
		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph);

		const outputName = this.compilation.getPath(
			getChunkFilenameTemplate(chunk, this.compilation.outputOptions),
			{
				chunk,
				contentHashType: "javascript"
			}
		);
		const rootOutputDir = getUndoPath(
			outputName,
			this.compilation.outputOptions.path,
			false
		);

		return Template.asString([
			withBaseURI
				? Template.asString([
						`${RuntimeGlobals.baseURI} = self.location + ${JSON.stringify(
							rootOutputDir ? "/../" + rootOutputDir : ""
						)};`
				  ])
				: "// no baseURI",
			"",
			"// object to store loaded chunks",
			'// "1" means "already loaded"',
			"var installedChunks = {",
			Template.indent(
				Array.from(initialChunkIds, id => `${JSON.stringify(id)}: 1`).join(
					",\n"
				)
			),
			"};",
			"",
			withLoading
				? Template.asString([
						"// importScripts chunk loading",
						`var installChunk = ${runtimeTemplate.basicFunction("data", [
							runtimeTemplate.destructureArray(
								["chunkIds", "moreModules", "runtime"],
								"data"
							),
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
							Template.indent("installedChunks[chunkIds.pop()] = 1;"),
							"parentChunkLoadingFunction(data);"
						])};`
				  ])
				: "// no chunk install function needed",
			withLoading
				? Template.asString([
						`${fn}.i = ${runtimeTemplate.basicFunction(
							"chunkId, promises",
							hasJsMatcher !== false
								? [
										'// "1" is the signal for "already loaded"',
										"if(!installedChunks[chunkId]) {",
										Template.indent([
											hasJsMatcher === true
												? "if(true) { // all chunks have JS"
												: `if(${hasJsMatcher("chunkId")}) {`,
											Template.indent(
												`importScripts(${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId));`
											),
											"}"
										]),
										"}"
								  ]
								: "installedChunks[chunkId] = 1;"
						)};`,
						"",
						`var chunkLoadingGlobal = ${chunkLoadingGlobalExpr} = ${chunkLoadingGlobalExpr} || [];`,
						"var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);",
						"chunkLoadingGlobal.push = installChunk;"
				  ])
				: "// no chunk loading",
			"",
			withHmr
				? Template.asString([
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							"var success = false;",
							`${globalObject}[${JSON.stringify(
								hotUpdateGlobal
							)}] = ${runtimeTemplate.basicFunction("_, moreModules, runtime", [
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
							])};`,
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
						`${
							RuntimeGlobals.hmrDownloadManifest
						} = ${runtimeTemplate.basicFunction("", [
							'if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");',
							`return fetch(${RuntimeGlobals.publicPath} + ${
								RuntimeGlobals.getUpdateManifestFilename
							}()).then(${runtimeTemplate.basicFunction("response", [
								"if(response.status === 404) return; // no update available",
								'if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);',
								"return response.json();"
							])});`
						])};`
				  ])
				: "// no HMR manifest"
		]);
	}
}

module.exports = ImportScriptsChunkLoadingRuntimeModule;
