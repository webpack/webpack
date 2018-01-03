/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;

class JsonpMainTemplatePlugin {

	apply(mainTemplate) {
		const needChunkLoadingCode = chunk => {
			var otherChunksInEntry = chunk.getEntrypoints().some(entrypoint => entrypoint.chunks.length > 1);
			var onDemandChunks = chunk.getNumberOfChunks() > 0;
			return otherChunksInEntry || onDemandChunks;
		};
		// TODO refactor this
		if(!mainTemplate.hooks.jsonpScript) {
			mainTemplate.hooks.jsonpScript = new SyncWaterfallHook(["source", "chunk", "hash"]);
		}

		mainTemplate.hooks.localVars.tap("JsonpMainTemplatePlugin", (source, chunk) => {
			if(needChunkLoadingCode(chunk)) {
				return Template.asString([
					source,
					"",
					"// object to store loaded and loading chunks",
					"var installedChunks = {",
					Template.indent(
						chunk.ids.map(id => `${JSON.stringify(id)}: 0`).join(",\n")
					),
					"};",
					"",
					"var scheduledModules = [];"
				]);
			}
			return source;
		});
		mainTemplate.hooks.jsonpScript.tap("JsonpMainTemplatePlugin", (_, chunk, hash) => {
			const chunkFilename = mainTemplate.outputOptions.chunkFilename;
			const chunkMaps = chunk.getChunkMaps();
			const crossOriginLoading = mainTemplate.outputOptions.crossOriginLoading;
			const chunkLoadTimeout = mainTemplate.outputOptions.chunkLoadTimeout;
			const scriptSrcPath = mainTemplate.getAssetPath(JSON.stringify(chunkFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
				chunk: {
					id: "\" + chunkId + \"",
					hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
					hashWithLength(length) {
						const shortChunkHashMap = Object.create(null);
						Object.keys(chunkMaps.hash).forEach(chunkId => {
							if(typeof chunkMaps.hash[chunkId] === "string")
								shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
						});
						return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
					},
					name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
				}
			});
			return Template.asString([
				"var script = document.createElement('script');",
				"script.charset = 'utf-8';",
				`script.timeout = ${chunkLoadTimeout};`,
				crossOriginLoading ? `script.crossOrigin = ${JSON.stringify(crossOriginLoading)};` : "",
				`if (${mainTemplate.requireFn}.nc) {`,
				Template.indent(`script.setAttribute("nonce", ${mainTemplate.requireFn}.nc);`),
				"}",
				`script.src = ${mainTemplate.requireFn}.p + ${scriptSrcPath};`,
				"var timeout = setTimeout(function(){",
				Template.indent([
					"onScriptComplete({ type: 'timeout', target: script });",
				]),
				`}, ${chunkLoadTimeout});`,
				"script.onerror = script.onload = onScriptComplete;",
				"function onScriptComplete(event) {",
				Template.indent([
					"// avoid mem leaks in IE.",
					"script.onerror = script.onload = null;",
					"clearTimeout(timeout);",
					"var chunk = installedChunks[chunkId];",
					"if(chunk !== 0) {",
					Template.indent([
						"if(chunk) {",
						Template.indent([
							"var errorType = event && (event.type === 'load' ? 'missing' : event.type);",
							"var realSrc = event && event.target && event.target.src;",
							"var error = new Error('Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')');",
							"error.type = errorType;",
							"error.request = realSrc;",
							"chunk[1](error);"
						]),
						"}",
						"installedChunks[chunkId] = undefined;"
					]),
					"}"
				]),
				"};",
			]);
		});
		mainTemplate.hooks.requireEnsure.tap("JsonpMainTemplatePlugin", (source, chunk, hash) => {
			return Template.asString([
				source,
				"",
				"// JSONP chunk loading for javascript",
				"",
				"var installedChunkData = installedChunks[chunkId];",
				"if(installedChunkData !== 0) { // 0 means \"already installed\".",
				Template.indent([
					"",
					"// a Promise means \"currently loading\".",
					"if(installedChunkData) {",
					Template.indent([
						"promises.push(installedChunkData[2]);"
					]),
					"} else {",
					Template.indent([
						"// setup Promise in chunk cache",
						"var promise = new Promise(function(resolve, reject) {",
						Template.indent([
							"installedChunkData = installedChunks[chunkId] = [resolve, reject];"
						]),
						"});",
						"promises.push(installedChunkData[2] = promise);",
						"",
						"// start chunk loading",
						"var head = document.getElementsByTagName('head')[0];",
						mainTemplate.hooks.jsonpScript.call("", chunk, hash),
						"head.appendChild(script);"
					]),
					"}",
				]),
				"}",
			]);
		});
		mainTemplate.hooks.requireExtensions.tap("JsonpMainTemplatePlugin", (source, chunk) => {
			if(chunk.getNumberOfChunks() === 0) return source;

			return Template.asString([
				source,
				"",
				"// on error function for async loading",
				`${mainTemplate.requireFn}.oe = function(err) { console.error(err); throw err; };`
			]);
		});
		mainTemplate.hooks.bootstrap.tap("JsonpMainTemplatePlugin", (source, chunk, hash) => {
			if(needChunkLoadingCode(chunk)) {
				return Template.asString([
					source,
					"",
					"// install a JSONP callback for chunk loading",
					"function webpackJsonpCallback(data) {",
					Template.indent([
						"var chunkIds = data[0], moreModules = data[1], executeModules = data[2];",
						"// add \"moreModules\" to the modules object,",
						"// then flag all \"chunkIds\" as loaded and fire callback",
						"var moduleId, chunkId, i = 0, resolves = [], result;",
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
							Template.indent(mainTemplate.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
							"}"
						]),
						"}",
						"if(parentJsonpFunction) parentJsonpFunction(data);",
						"while(resolves.length) {",
						Template.indent("resolves.shift()();"),
						"}",
						mainTemplate.entryPointInChildren(chunk) ? [
							"scheduledModules.push.apply(scheduledModules, executeModules || []);",
							"",
							"for(i = 0; i < scheduledModules.length; i++) {",
							Template.indent([
								"var scheduledModule = scheduledModules[i];",
								"var fullfilled = true;",
								"for(var j = 1; j < scheduledModule.length; j++) {",
								Template.indent([
									"var depId = scheduledModule[j];",
									"if(installedChunks[depId] !== 0) fullfilled = false;"
								]),
								"}",
								"if(fullfilled) {",
								Template.indent([
									"scheduledModules.splice(i--, 1);",
									"result = " + mainTemplate.requireFn + "(" + mainTemplate.requireFn + ".s = scheduledModule[0]);",
								]),
								"}"
							]),
							"}",
							"return result;",
						] : ""
					]),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.hooks.startup.tap("JsonpMainTemplatePlugin", (source, chunk, hash) => {
			if(needChunkLoadingCode(chunk)) {
				var jsonpFunction = mainTemplate.outputOptions.jsonpFunction;
				var globalObject = mainTemplate.outputOptions.globalObject;
				return Template.asString([
					`var jsonpArray = ${globalObject}[${JSON.stringify(jsonpFunction)}] = ${globalObject}[${JSON.stringify(jsonpFunction)}] || [];`,
					"var parentJsonpFunction = jsonpArray.push.bind(jsonpArray);",
					"jsonpArray.push = webpackJsonpCallback;",
					"jsonpArray = jsonpArray.slice();",
					"for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);",
					"",
					source
				]);
			}
			return source;
		});
		mainTemplate.hooks.hotBootstrap.tap("JsonpMainTemplatePlugin", (source, chunk, hash) => {
			const globalObject = mainTemplate.outputOptions.globalObject;
			const hotUpdateChunkFilename = mainTemplate.outputOptions.hotUpdateChunkFilename;
			const hotUpdateMainFilename = mainTemplate.outputOptions.hotUpdateMainFilename;
			const crossOriginLoading = mainTemplate.outputOptions.crossOriginLoading;
			const hotUpdateFunction = mainTemplate.outputOptions.hotUpdateFunction;
			const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateChunkFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
				chunk: {
					id: "\" + chunkId + \""
				}
			});
			const currentHotUpdateMainFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateMainFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`
			});
			const runtimeSource = Template.getFunctionContent(require("./JsonpMainTemplate.runtime.js"))
				.replace(/\/\/\$semicolon/g, ";")
				.replace(/\$require\$/g, mainTemplate.requireFn)
				.replace(/\$crossOriginLoading\$/g, crossOriginLoading ? `script.crossOrigin = ${JSON.stringify(crossOriginLoading)}` : "")
				.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
				.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
				.replace(/\$hash\$/g, JSON.stringify(hash));
			return `${source}
function hotDisposeChunk(chunkId) {
	delete installedChunks[chunkId];
}
var parentHotUpdateCallback = ${globalObject}[${JSON.stringify(hotUpdateFunction)}];
${globalObject}[${JSON.stringify(hotUpdateFunction)}] = ${runtimeSource}`;
		});
		mainTemplate.hooks.hash.tap("JsonpMainTemplatePlugin", hash => {
			hash.update("jsonp");
			hash.update("5");
			hash.update(`${mainTemplate.outputOptions.globalObject}`);
			hash.update(`${mainTemplate.outputOptions.chunkFilename}`);
			hash.update(`${mainTemplate.outputOptions.jsonpFunction}`);
			hash.update(`${mainTemplate.outputOptions.hotUpdateFunction}`);
		});
	}
}
module.exports = JsonpMainTemplatePlugin;
