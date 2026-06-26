/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
/** @typedef {import("../Compilation")} Compilation */
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	generateJavascriptHMR
} = require("../hmr/JavascriptHotModuleReplacementHelper");
const chunkHasJs = require("../javascript/JavascriptModulesPlugin").chunkHasJs;
const { getInitialChunkIds } = require("../javascript/StartupHelpers");
const compileBooleanMatcher = require("../util/compileBooleanMatcher");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */

/**
 * @typedef {object} JsonpCompilationPluginHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPreload
 * @property {SyncWaterfallHook<[string, Chunk]>} linkPrefetch
 */

class JsonpChunkLoadingRuntimeModule extends RuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("jsonp chunk loading", RuntimeModule.STAGE_ATTACH);
		/** @type {ReadOnlyRuntimeRequirements} */
		this._runtimeRequirements = runtimeRequirements;
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
		return `${RuntimeGlobals.baseURI} = (typeof document !== 'undefined' && document.baseURI) || self.location.href;`;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const {
			runtimeTemplate,
			outputOptions: {
				chunkLoadingGlobal,
				hotUpdateGlobal,
				crossOriginLoading,
				scriptType,
				charset
			}
		} = compilation;
		const globalObject = runtimeTemplate.globalObject;
		const { linkPreload, linkPrefetch } =
			JsonpChunkLoadingRuntimeModule.getCompilationHooks(compilation);
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const withBaseURI = this._runtimeRequirements.has(RuntimeGlobals.baseURI);
		const withLoading = this._runtimeRequirements.has(
			RuntimeGlobals.ensureChunkHandlers
		);
		const withCallback = this._runtimeRequirements.has(
			RuntimeGlobals.chunkCallback
		);
		const withOnChunkLoad = this._runtimeRequirements.has(
			RuntimeGlobals.onChunksLoaded
		);
		const withHmr = this._runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const withHmrManifest = this._runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadManifest
		);
		const withFetchPriority = this._runtimeRequirements.has(
			RuntimeGlobals.hasFetchPriority
		);
		const chunkLoadingGlobalExpr = `${globalObject}[${JSON.stringify(
			chunkLoadingGlobal
		)}]`;
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const withPrefetch =
			this._runtimeRequirements.has(RuntimeGlobals.prefetchChunkHandlers) &&
			chunk.hasChildByOrder(chunkGraph, "prefetch", true, chunkHasJs);
		const withPreload =
			this._runtimeRequirements.has(RuntimeGlobals.preloadChunkHandlers) &&
			chunk.hasChildByOrder(chunkGraph, "preload", true, chunkHasJs);
		const conditionMap = chunkGraph.getChunkConditionMap(chunk, chunkHasJs);
		const hasJsMatcher = compileBooleanMatcher(conditionMap);
		const initialChunkIds = getInitialChunkIds(chunk, chunkGraph, chunkHasJs);

		const stateExpression = withHmr
			? `${RuntimeGlobals.hmrRuntimeStatePrefix}_jsonp`
			: undefined;

		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const installedChunksObject = `{\n${Template.indent(
			Array.from(initialChunkIds, (id) => `${JSON.stringify(id)}: 0`).join(
				",\n"
			)
		)}\n}`;
		return Template.asString([
			withBaseURI ? this._generateBaseUri(chunk) : "// no baseURI",
			"",
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded",
			`${cst} installedChunks = ${
				stateExpression
					? runtimeTemplate.assignOr(stateExpression, installedChunksObject)
					: installedChunksObject
			};`,
			"",
			withLoading
				? Template.asString([
						`${fn}.j = ${runtimeTemplate.basicFunction(
							`chunkId, promises${withFetchPriority ? ", fetchPriority" : ""}`,
							hasJsMatcher !== false
								? Template.indent([
										"// JSONP chunk loading for javascript",
										`${lt} installedChunkData = ${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;`,
										'if(installedChunkData !== 0) { // 0 means "already installed".',
										Template.indent([
											"",
											'// a Promise means "currently loading".',
											"if(installedChunkData) {",
											Template.indent([
												"promises.push(installedChunkData[2]);"
											]),
											"} else {",
											Template.indent([
												hasJsMatcher === true
													? "if(true) { // all chunks have JS"
													: `if(${hasJsMatcher("chunkId")}) {`,
												Template.indent([
													"// setup Promise in chunk cache",
													`${cst} promise = new Promise(${runtimeTemplate.expressionFunction(
														"installedChunkData = installedChunks[chunkId] = [resolve, reject]",
														"resolve, reject"
													)});`,
													"promises.push(installedChunkData[2] = promise);",
													"",
													"// start chunk loading",
													`${cst} url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`,
													"// create error before stack unwound to get useful stacktrace later",
													`${cst} error = new Error();`,
													`${cst} loadingEnded = ${runtimeTemplate.basicFunction(
														"event",
														[
															`if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId)) {`,
															Template.indent([
																"installedChunkData = installedChunks[chunkId];",
																"if(installedChunkData !== 0) installedChunks[chunkId] = undefined;",
																"if(installedChunkData) {",
																Template.indent([
																	`${cst} errorType = event && (event.type === 'load' ? 'missing' : event.type);`,
																	`${cst} realSrc = event && event.target && event.target.src;`,
																	"error.message = 'Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')';",
																	"error.name = 'ChunkLoadError';",
																	"error.type = errorType;",
																	"error.request = realSrc;",
																	"installedChunkData[1](error);"
																]),
																"}"
															]),
															"}"
														]
													)};`,
													`${
														RuntimeGlobals.loadScript
													}(url, loadingEnded, "chunk-" + chunkId, chunkId${
														withFetchPriority ? ", fetchPriority" : ""
													});`
												]),
												hasJsMatcher === true
													? "}"
													: "} else installedChunks[chunkId] = 0;"
											]),
											"}"
										]),
										"}"
									])
								: Template.indent(["installedChunks[chunkId] = 0;"])
						)};`
					])
				: "// no chunk on demand loading",
			"",
			withPrefetch && hasJsMatcher !== false
				? `${
						RuntimeGlobals.prefetchChunkHandlers
					}.j = ${runtimeTemplate.basicFunction("chunkId", [
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasJsMatcher === true ? "true" : hasJsMatcher("chunkId")
						}) {`,
						Template.indent([
							"installedChunks[chunkId] = null;",
							linkPrefetch.call(
								Template.asString([
									`${cst} link = document.createElement('link');`,
									charset ? "link.charset = 'utf-8';" : "",
									crossOriginLoading
										? `link.crossOrigin = ${JSON.stringify(
												crossOriginLoading
											)};`
										: "",
									`if (${RuntimeGlobals.scriptNonce}) {`,
									Template.indent(
										`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
									),
									"}",
									'link.rel = "prefetch";',
									'link.as = "script";',
									`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`
								]),
								chunk
							),
							"document.head.appendChild(link);"
						]),
						"}"
					])};`
				: "// no prefetching",
			"",
			withPreload && hasJsMatcher !== false
				? `${
						RuntimeGlobals.preloadChunkHandlers
					}.j = ${runtimeTemplate.basicFunction("chunkId", [
						`if((!${
							RuntimeGlobals.hasOwnProperty
						}(installedChunks, chunkId) || installedChunks[chunkId] === undefined) && ${
							hasJsMatcher === true ? "true" : hasJsMatcher("chunkId")
						}) {`,
						Template.indent([
							"installedChunks[chunkId] = null;",
							linkPreload.call(
								Template.asString([
									`${cst} link = document.createElement('link');`,
									scriptType && scriptType !== "module"
										? `link.type = ${JSON.stringify(scriptType)};`
										: "",
									charset ? "link.charset = 'utf-8';" : "",
									`if (${RuntimeGlobals.scriptNonce}) {`,
									Template.indent(
										`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
									),
									"}",
									scriptType === "module"
										? 'link.rel = "modulepreload";'
										: 'link.rel = "preload";',
									scriptType === "module" ? "" : 'link.as = "script";',
									`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`,
									crossOriginLoading
										? crossOriginLoading === "use-credentials"
											? 'link.crossOrigin = "use-credentials";'
											: Template.asString([
													"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
													Template.indent(
														`link.crossOrigin = ${JSON.stringify(
															crossOriginLoading
														)};`
													),
													"}"
												])
										: ""
								]),
								chunk
							),
							"document.head.appendChild(link);"
						]),
						"}"
					])};`
				: "// no preloaded",
			"",
			withHmr
				? Template.asString([
						`${lt} currentUpdatedModulesList;`,
						`${cst} waitingUpdateResolves = {};`,
						"function loadUpdateChunk(chunkId, updatedModulesList) {",
						Template.indent([
							"currentUpdatedModulesList = updatedModulesList;",
							`return new Promise(${runtimeTemplate.basicFunction(
								"resolve, reject",
								[
									"waitingUpdateResolves[chunkId] = resolve;",
									"// start update chunk loading",
									`${cst} url = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkUpdateScriptFilename}(chunkId);`,
									"// create error before stack unwound to get useful stacktrace later",
									`${cst} error = new Error();`,
									`${cst} loadingEnded = ${runtimeTemplate.basicFunction(
										"event",
										[
											"if(waitingUpdateResolves[chunkId]) {",
											Template.indent([
												"waitingUpdateResolves[chunkId] = undefined",
												`${cst} errorType = event && (event.type === 'load' ? 'missing' : event.type);`,
												`${cst} realSrc = event && event.target && event.target.src;`,
												"error.message = 'Loading hot update chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')';",
												"error.name = 'ChunkLoadError';",
												"error.type = errorType;",
												"error.request = realSrc;",
												"reject(error);"
											]),
											"}"
										]
									)};`,
									`${RuntimeGlobals.loadScript}(url, loadingEnded);`
								]
							)});`
						]),
						"}",
						"",
						`${globalObject}[${JSON.stringify(
							hotUpdateGlobal
						)}] = ${runtimeTemplate.basicFunction(
							"chunkId, moreModules, runtime",
							[
								"for(var moduleId in moreModules) {",
								Template.indent([
									`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
									Template.indent([
										"currentUpdate[moduleId] = moreModules[moduleId];",
										`${runtimeTemplate.optionalChaining("currentUpdatedModulesList", "push(moduleId)")};`
									]),
									"}"
								]),
								"}",
								"if(runtime) currentUpdateRuntime.push(runtime);",
								"if(waitingUpdateResolves[chunkId]) {",
								Template.indent([
									"waitingUpdateResolves[chunkId]();",
									"waitingUpdateResolves[chunkId] = undefined;"
								]),
								"}"
							]
						)};`,
						"",
						generateJavascriptHMR("jsonp")
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
				: "// no HMR manifest",
			"",
			withOnChunkLoad
				? `${
						RuntimeGlobals.onChunksLoaded
					}.j = ${runtimeTemplate.returningFunction(
						"installedChunks[chunkId] === 0",
						"chunkId"
					)};`
				: "// no on chunks loaded",
			"",
			withCallback || withLoading
				? Template.asString([
						"// install a JSONP callback for chunk loading",
						`${cst} webpackJsonpCallback = ${runtimeTemplate.basicFunction(
							"parentChunkLoadingFunction, data",
							[
								runtimeTemplate.destructureArray(
									["chunkIds", "moreModules", "runtime"],
									"data"
								),
								'// add "moreModules" to the modules object,',
								'// then flag all "chunkIds" as loaded and fire callback',
								"var moduleId, chunkId, i = 0;",
								`if(chunkIds.some(${runtimeTemplate.returningFunction(
									"installedChunks[id] !== 0",
									"id"
								)})) {`,
								Template.indent([
									"for(moduleId in moreModules) {",
									Template.indent([
										`if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
										Template.indent(
											`${RuntimeGlobals.moduleFactories}[moduleId] = moreModules[moduleId];`
										),
										"}"
									]),
									"}",
									`if(runtime) var result = runtime(${RuntimeGlobals.require});`
								]),
								"}",
								"if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);",
								"for(;i < chunkIds.length; i++) {",
								Template.indent([
									"chunkId = chunkIds[i];",
									`if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId) && installedChunks[chunkId]) {`,
									Template.indent("installedChunks[chunkId][0]();"),
									"}",
									"installedChunks[chunkId] = 0;"
								]),
								"}",
								withOnChunkLoad
									? `return ${RuntimeGlobals.onChunksLoaded}(result);`
									: ""
							]
						)}`,
						"",
						`${cst} chunkLoadingGlobal = ${runtimeTemplate.assignOr(chunkLoadingGlobalExpr, "[]")};`,
						"chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));",
						"chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));"
					])
				: "// no jsonp function"
		]);
	}
}

JsonpChunkLoadingRuntimeModule.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {JsonpCompilationPluginHooks} */ ({
			linkPreload: new SyncWaterfallHook(["source", "chunk"]),
			linkPrefetch: new SyncWaterfallHook(["source", "chunk"])
		})
);

module.exports = JsonpChunkLoadingRuntimeModule;
