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
		const withDefer = this.runtimeRequirements.has(RuntimeGlobals.startup);
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
						`${fn}.push(function(chunkId, promises) {`,
						Template.indent([
							"var head = document.getElementsByTagName('head')[0];",
							"",
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
									jsonpScript.call("", chunk),
									"head.appendChild(script);"
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
													"head.appendChild(link);"
												]),
												"}"
											]),
											"});"
										]),
										"}"
								  ])
								: "// no chunk preloading needed"
						]),
						"});"
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
								"var head = document.getElementsByTagName('head')[0];",
								linkPrefetch.call("", chunk),
								"head.appendChild(link);"
							]),
							"}"
						]),
						"}",
						prefetchChunks && prefetchChunks.length > 0
							? prefetchChunks.map(c => `\nprefetchChunk(${c});`)
							: ""
				  ])
				: "// no prefetching",
			"",
			"// install a JSONP callback for chunk loading",
			"function webpackJsonpCallback(data) {",
			Template.indent([
				"var chunkIds = data[0];",
				"var moreModules = data[1];",
				withDefer ? "var executeModules = data[2];" : "",
				withPrefetch ? "var prefetchChunks = data[3] || [];" : "",
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
				"if(parentJsonpFunction) parentJsonpFunction(data);",
				withPrefetch
					? Template.asString([
							"// chunk prefetching for javascript",
							"prefetchChunks.forEach(prefetchChunk);"
					  ])
					: "",
				"while(resolves.length) {",
				Template.indent("resolves.shift()();"),
				"}",
				withDefer
					? Template.asString([
							"",
							"// add entry modules from loaded chunk to deferred list",
							"deferredModules.push.apply(deferredModules, executeModules || []);",
							"",
							"// run deferred modules when all chunks ready",
							"return checkDeferredModules();"
					  ])
					: ""
			]),
			"};",
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
		]);
	}
}

module.exports = JsonpChunkLoadingRuntimeModule;
