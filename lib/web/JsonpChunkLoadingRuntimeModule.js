/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const getEntryInfo = require("./JsonpHelpers").getEntryInfo;

class JsonpChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(
		chunk,
		chunkGraph,
		outputOptions,
		runtimeRequirements,
		jsonpScript,
		linkPreload,
		linkPrefetch
	) {
		super("jsonp chunk loading", 10);
		this.chunk = chunk;
		this.chunkGraph = chunkGraph;
		this.outputOptions = outputOptions;
		this.runtimeRequirements = runtimeRequirements;
		this.jsonpScript = jsonpScript;
		this.linkPreload = linkPreload;
		this.linkPrefetch = linkPrefetch;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			chunk,
			jsonpScript,
			linkPreload,
			linkPrefetch,
			chunkGraph,
			outputOptions
		} = this;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		const needPrefetchingCode = chunk => {
			const allPrefetchChunks = chunk.getChildIdsByOrdersMap(chunkGraph, true)
				.prefetch;
			return allPrefetchChunks && Object.keys(allPrefetchChunks).length;
		};
		const withLoading = this.runtimeRequirements.has(
			RuntimeGlobals.ensureChunkHandlers
		);
		const needEntryDeferringCode = chunk => {
			for (const chunkGroup of chunk.groupsIterable) {
				if (chunkGroup.chunks.length > 1) return true;
			}
			return false;
		};
		const withDefer = needEntryDeferringCode(chunk);
		const withHmr = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadUpdateHandlers
		);
		const withHmrManifest = this.runtimeRequirements.has(
			RuntimeGlobals.hmrDownloadManifest
		);
		const withPrefetch = needPrefetchingCode(chunk);
		const preloadChunkMap = chunk.getChildIdsByOrdersMap(chunkGraph).preload;
		const withPreload =
			preloadChunkMap && Object.keys(preloadChunkMap).length > 0;
		const prefetchChunks = chunk.getChildIdsByOrders(chunkGraph).prefetch;
		const entries = getEntryInfo(chunkGraph, chunk);
		const jsonpObject = `${outputOptions.globalObject}[${JSON.stringify(
			outputOptions.jsonpFunction
		)}]`;
		return Template.asString([
			withPreload
				? `var chunkPreloadMap = ${JSON.stringify(
						preloadChunkMap,
						null,
						"\t"
				  )};`
				: "",
			"",
			"// object to store loaded and loading chunks",
			"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
			"// Promise = chunk loading, 0 = chunk loaded",
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 0`).join(",\n")
			),
			"};",
			"",
			withDefer
				? Template.asString([
						"var deferredModules = [",
						Template.indent(entries.map(e => JSON.stringify(e)).join(",\n")),
						"];"
				  ])
				: "",
			"",
			withLoading
				? Template.asString([
						`${fn}.j = function(chunkId, promises) {`,
						Template.indent([
							"// JSONP chunk loading for javascript",
							`var installedChunkData = installedChunks[chunkId];`,
							'if(installedChunkData !== 0) { // 0 means "already installed".',
							Template.indent([
								"",
								'// a Promise means "currently loading".',
								"if(installedChunkData) {",
								Template.indent(["promises.push(installedChunkData[2]);"]),
								"} else {",
								Template.indent([
									"// setup Promise in chunk cache",
									"var promise = new Promise(function(resolve, reject) {",
									Template.indent([
										`installedChunkData = installedChunks[chunkId] = [resolve, reject];`
									]),
									"});",
									"promises.push(installedChunkData[2] = promise);",
									"",
									"// start chunk loading",
									`var url = ${RuntimeGlobals.publicPath} + ${
										RuntimeGlobals.getChunkScriptFilename
									}(chunkId);`,
									"var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };",
									jsonpScript.call("", chunk),
									"document.head.appendChild(script);",
									"",
									withHmr
										? "if(currentUpdateChunks && currentUpdateChunks[chunkId]) promises.push(loadUpdateChunk(chunkId));"
										: "// no HMR"
								]),
								"}"
							]),
							"}",
							"",
							withPreload
								? Template.asString([
										"// chunk preloading for javascript",
										`var chunkPreloadData = chunkPreloadMap[chunkId];`,
										"if(chunkPreloadData) {",
										Template.indent([
											"chunkPreloadData.forEach(function(chunkId) {",
											Template.indent([
												"if(installedChunks[chunkId] === undefined) {",
												Template.indent([
													"installedChunks[chunkId] = null;",
													linkPreload.call("", chunk),
													"document.head.appendChild(link);"
												]),
												"}"
											]),
											"});"
										]),
										"}"
								  ])
								: "// no chunk preloading needed"
						]),
						"};"
				  ])
				: "// no chunk on demand loading",
			"",
			withPrefetch
				? Template.asString([
						"function prefetchChunk(chunkId) {",
						Template.indent([
							"if(installedChunks[chunkId] === undefined) {",
							Template.indent([
								"installedChunks[chunkId] = null;",
								linkPrefetch.call("", chunk),
								"document.head.appendChild(link);"
							]),
							"}"
						]),
						"}",
						prefetchChunks && prefetchChunks.length > 0
							? prefetchChunks
									.map(c => `prefetchChunk(${JSON.stringify(c)});`)
									.join("\n")
							: ""
				  ])
				: "// no prefetching",
			"",
			withHmr
				? Template.asString([
						"var currentUpdateChunks;",
						"var currentUpdate;",
						"var currentUpdateRuntime;",
						"var currentUpdatedModulesList;",
						"var waitingUpdateResolves = {};",
						"function loadUpdateChunk(chunkId) {",
						Template.indent([
							"return new Promise(function(resolve, reject) {",
							Template.indent([
								"waitingUpdateResolves[chunkId] = resolve;",
								"// start update chunk loading",
								`var url = ${RuntimeGlobals.publicPath} + ${
									RuntimeGlobals.getChunkUpdateScriptFilename
								}(chunkId);`,
								"var loadingEnded = function() {",
								Template.indent([
									"if(waitingUpdateResolves[chunkId]) {",
									Template.indent([
										"waitingUpdateResolves[chunkId] = undefined",
										"return reject;"
									]),
									"}"
								]),
								"};",
								jsonpScript.call("", chunk),
								"document.head.appendChild(script);"
							]),
							"});"
						]),
						"}",
						"",
						`${outputOptions.globalObject}[${JSON.stringify(
							outputOptions.hotUpdateFunction
						)}] = function(chunkId, moreModules, runtime) {`,
						Template.indent([
							"for(var moduleId in moreModules) {",
							Template.indent([
								"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
								Template.indent([
									"currentUpdate[moduleId] = moreModules[moduleId];",
									"if(currentUpdatedModulesList) currentUpdatedModulesList.push(moduleId);"
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
						]),
						"};",
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
							"currentUpdatedModulesList = updatedModulesList;",
							"chunkIds.forEach(function(chunkId) {",
							Template.indent([
								"if(installedChunks[chunkId] !== undefined) {",
								Template.indent(["promises.push(loadUpdateChunk(chunkId));"]),
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
				: "// no HMR manifest",
			"",
			withDefer
				? Template.asString([
						"var checkDeferredModules = function() {};",
						"function checkDeferredModulesImpl() {",
						Template.indent([
							"var result;",
							"for(var i = 0; i < deferredModules.length; i++) {",
							Template.indent([
								"var deferredModule = deferredModules[i];",
								"var fulfilled = true;",
								"for(var j = 1; j < deferredModule.length; j++) {",
								Template.indent([
									"var depId = deferredModule[j];",
									"if(installedChunks[depId] !== 0) fulfilled = false;"
								]),
								"}",
								"if(fulfilled) {",
								Template.indent([
									"deferredModules.splice(i--, 1);",
									"result = " +
										"__webpack_require__(" +
										`${RuntimeGlobals.entryModuleId} = deferredModule[0]);`
								]),
								"}"
							]),
							"}",
							"return result;"
						]),
						"}",
						`${RuntimeGlobals.startup} = function() {`,
						Template.indent([
							"return (checkDeferredModules = checkDeferredModulesImpl)();"
						]),
						"};"
				  ])
				: "// no deferred startup",
			"",
			withDefer || withLoading
				? Template.asString([
						"// install a JSONP callback for chunk loading",
						"function webpackJsonpCallback(data) {",
						Template.indent([
							"var chunkIds = data[0];",
							"var moreModules = data[1];",
							withDefer ? "var executeModules = data[2];" : "",
							"var runtime = data[3];",
							withPrefetch ? "var prefetchChunks = data[4];" : "",
							'// add "moreModules" to the modules object,',
							'// then flag all "chunkIds" as loaded and fire callback',
							"var moduleId, chunkId, i = 0, resolves = [];",
							"for(;i < chunkIds.length; i++) {",
							Template.indent([
								"chunkId = chunkIds[i];",
								"if(installedChunks[chunkId]) {",
								Template.indent("resolves.push(installedChunks[chunkId][0]);"),
								"}",
								"installedChunks[chunkId] = 0;"
							]),
							"}",
							"for(moduleId in moreModules) {",
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
							"if(parentJsonpFunction) parentJsonpFunction(data);",
							withPrefetch
								? Template.asString([
										"// chunk prefetching for javascript",
										"if(prefetchChunks) prefetchChunks.forEach(prefetchChunk);"
								  ])
								: "",
							"while(resolves.length) {",
							Template.indent("resolves.shift()();"),
							"}",
							withDefer
								? Template.asString([
										"",
										"// add entry modules from loaded chunk to deferred list",
										"if(executeModules) deferredModules.push.apply(deferredModules, executeModules);",
										"",
										"// run deferred modules when all chunks ready",
										"return checkDeferredModules();"
								  ])
								: ""
						]),
						"};",
						"",
						`var jsonpArray = ${jsonpObject} = ${jsonpObject} || [];`,
						"var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);",
						"jsonpArray.push = webpackJsonpCallback;",
						withDefer
							? Template.asString([
									"jsonpArray = jsonpArray.slice();",
									"for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);"
							  ])
							: "",
						"var parentJsonpFunction = oldJsonpFunction;"
				  ])
				: "// no jsonp function"
		]);
	}
}

module.exports = JsonpChunkLoadingRuntimeModule;
