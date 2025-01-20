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

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

class ImportScriptsChunkLoadingRuntimeModule extends RuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 * @param {boolean} withCreateScriptUrl with createScriptUrl support
	 */
	constructor(runtimeRequirements, withCreateScriptUrl) {
		super("importScripts chunk loading", RuntimeModule.STAGE_ATTACH);
		this.runtimeRequirements = runtimeRequirements;
		this._withCreateScriptUrl = withCreateScriptUrl;
	}

	/**
	 * @private
	 * @param {Chunk} chunk chunk
	 * @returns {string} generated code
	 */
	_generateBaseUri(chunk) {
		const options = chunk.getEntryOptions();
		if (options && options.baseUri) {
			return `${RuntimeGlobals.baseURI} = ${JSON.stringify(options.baseUri)};`;
		}
		const compilation = /** @type {Compilation} */ (this.compilation);
		const outputName = compilation.getPath(
			getChunkFilenameTemplate(chunk, compilation.outputOptions),
			{
				chunk,
				contentHashType: "javascript"
			}
		);
		const rootOutputDir = getUndoPath(
			outputName,
			/** @type {string} */ (compilation.outputOptions.path),
			false
		);
		return `${RuntimeGlobals.baseURI} = self.location + ${JSON.stringify(
			rootOutputDir ? `/../${rootOutputDir}` : ""
		)};`;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
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
		const globalObject = compilation.runtimeTemplate.globalObject;
		const chunkLoadingGlobalExpr = `${globalObject}[${JSON.stringify(
			compilation.outputOptions.chunkLoadingGlobal
		)}]`;

		const hasJsMatcher = compileBooleanMatcher(
			chunkGraph.getChunkConditionMap(chunk, chunkHasJs)
		);
		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph, chunkHasJs);
		const runtimeTemplate = compilation.runtimeTemplate;
		const { _withCreateScriptUrl: withCreateScriptUrl } = this;

		// Find entry module ID
		const entryModules = chunkGraph.getChunkEntryModulesIterable(chunk);
		const entryModuleId = entryModules
			? (Array.from(entryModules)[0] && Array.from(entryModules)[0].id) || null
			: null;

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_importScripts`
			: undefined;

		return Template.asString([
			withBaseURI ? this._generateBaseUri(chunk) : "// no baseURI",
			"",
			"// object to store loaded chunks",
			'// "1" means "already loaded"',
			`var installedChunks = ${
				stateExpression ? `${stateExpression} = ${stateExpression} || ` : ""
			}{`,
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
							`if(runtime) runtime(${RuntimeGlobals.require});`,
							"while(chunkIds.length)",
							Template.indent("installedChunks[chunkIds.pop()] = 1;"),
							"parentChunkLoadingFunction(data);",
							// Execute entry module if it's newly installed
							entryModuleId
								? Template.asString([
										`if(moreModules[${JSON.stringify(entryModuleId)}]) {`,
										Template.indent(
											`${RuntimeGlobals.require}(${JSON.stringify(entryModuleId)});`
										),
										"}"
									])
								: "// no entry module id"
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
												`importScripts(${
													withCreateScriptUrl
														? `${RuntimeGlobals.createScriptUrl}(${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId))`
														: `${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId)`
												});`
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
						"chunkLoadingGlobal.push = installChunk;",
						"",
						// Execute any pending chunks immediately
						"if(chunkLoadingGlobal.length > 0) {",
						Template.indent([
							"chunkLoadingGlobal.forEach(function(data) { installChunk(data); });",
							"chunkLoadingGlobal.length = 0;"
						]),
						"}",
						"",
						// Execute entry module immediately if available
						entryModuleId
							? Template.asString([
									"// Execute entry module if present",
									`if(${RuntimeGlobals.moduleFactories}[${JSON.stringify(entryModuleId)}]) {`,
									Template.indent(
										`${RuntimeGlobals.require}(${JSON.stringify(entryModuleId)});`
									),
									"}"
								])
							: "// no entry module id"
					])
				: "// no chunk loading",
			"",
			withHmr
				? Template.asString([
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							"var success = false;",
							`${globalObject}[${JSON.stringify(
								compilation.outputOptions.hotUpdateGlobal
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
							`importScripts(${
								withCreateScriptUrl
									? `${RuntimeGlobals.createScriptUrl}(${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId))`
									: `${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId)`
							});`,
							'if(!success) throw new Error("Loading update chunk failed for unknown reason");'
						]),
						"}"
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
