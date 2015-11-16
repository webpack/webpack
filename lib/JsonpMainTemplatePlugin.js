/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("./Template");

function JsonpMainTemplatePlugin() {}
module.exports = JsonpMainTemplatePlugin;

JsonpMainTemplatePlugin.prototype.constructor = JsonpMainTemplatePlugin;
JsonpMainTemplatePlugin.prototype.apply = function(mainTemplate) {
	mainTemplate.plugin("local-vars", function(source, chunk) {
		if(chunk.chunks.length > 0) {
			return this.asString([
				source,
				"",
				"// objects to store loaded and loading chunks",
				"var installedChunks = {",
				this.indent(
					chunk.ids.map(function(id) {
						return id + ": 0";
					}).join(",\n")
				),
				"};"
			]);
		}
		return source;
	});
	mainTemplate.plugin("require-ensure", function(_, chunk, hash) {
		var filename = this.outputOptions.filename || "bundle.js";
		var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
		var chunkMaps = chunk.getChunkMaps();
		var crossOriginLoading = this.outputOptions.crossOriginLoading;
		var chunkLoadTimeout = this.outputOptions.chunkLoadTimeout || 120000;
		return this.asString([
			"if(installedChunks[chunkId] === 0)",
			this.indent([
				"return Promise.resolve()"
			]),
			"",
			"// an Promise means \"currently loading\".",
			"if(installedChunks[chunkId]) {",
			this.indent([
				"return installedChunks[chunkId][2];"
			]),
			"}",
			"// start chunk loading",
			"var head = document.getElementsByTagName('head')[0];",
			"var script = document.createElement('script');",
			"script.type = 'text/javascript';",
			"script.charset = 'utf-8';",
			"script.async = true;",
			"script.timeout = " + chunkLoadTimeout + ";",
			crossOriginLoading ? "script.crossOrigin = '" + crossOriginLoading + "';" : "",
			"script.src = " + this.requireFn + ".p + " +
			this.applyPluginsWaterfall("asset-path", JSON.stringify(chunkFilename), {
				hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
				hashWithLength: function(length) {
					return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
				}.bind(this),
				chunk: {
					id: "\" + chunkId + \"",
					hash: "\" + " + JSON.stringify(chunkMaps.hash) + "[chunkId] + \"",
					hashWithLength: function(length) {
						var shortChunkHashMap = {};
						Object.keys(chunkMaps.hash).forEach(function(chunkId) {
							if(typeof chunkMaps.hash[chunkId] === "string")
								shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
						});
						return "\" + " + JSON.stringify(shortChunkHashMap) + "[chunkId] + \"";
					},
					name: "\" + (" + JSON.stringify(chunkMaps.name) + "[chunkId]||chunkId) + \""
				}
			}) + ";",
			"var timeout = setTimeout(onScriptComplete, " + chunkLoadTimeout + ");",
			"script.onerror = script.onload = onScriptComplete;",
			"function onScriptComplete() {",
			this.indent([
				"// avoid mem leaks in IE.",
				"script.onerror = script.onload = null;",
				"clearTimeout(timeout);",
				"var chunk = installedChunks[chunkId];",
				"if(chunk !== 0) {",
				this.indent([
					"if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));",
					"installedChunks[chunkId] = undefined;"
				]),
				"}"
			]),
			"};",
			"head.appendChild(script);",
			"",
			"var promise = new Promise(function(resolve, reject) {",
			this.indent([
				"installedChunks[chunkId] = [resolve, reject];"
			]),
			"});",
			"return installedChunks[chunkId][2] = promise;"
		]);
	});
	mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
		if(chunk.chunks.length > 0) {
			var jsonpFunction = this.outputOptions.jsonpFunction || Template.toIdentifier("webpackJsonp" + (this.outputOptions.library || ""));
			return this.asString([
				source,
				"",
				"// install a JSONP callback for chunk loading",
				"var parentJsonpFunction = window[" + JSON.stringify(jsonpFunction) + "];",
				"window[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {",
				this.indent([
					"// add \"moreModules\" to the modules object,",
					"// then flag all \"chunkIds\" as loaded and fire callback",
					"var moduleId, chunkId, i = 0, resolves = [];",
					"for(;i < chunkIds.length; i++) {",
					this.indent([
						"chunkId = chunkIds[i];",
						"if(installedChunks[chunkId])",
						this.indent("resolves.push(installedChunks[chunkId][0]);"),
						"installedChunks[chunkId] = 0;"
					]),
					"}",
					"for(moduleId in moreModules) {",
					this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
					"}",
					"if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);",
					"while(resolves.length)",
					this.indent("resolves.shift()();"), (this.entryPointInChildren(chunk) ? [
						"if(executeModule + 1) { // typeof executeModule === \"number\"",
						this.indent([
							"return " + this.requireFn + "(executeModule);"
						]),
						"}"
					] : "")
				]),
				"};"
			]);
		}
		return source;
	});
	mainTemplate.plugin("hot-bootstrap", function(source, chunk, hash) {
		var hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
		var hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
		var hotUpdateFunction = this.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (this.outputOptions.library || ""));
		var currentHotUpdateChunkFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateChunkFilename), {
			hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
			hashWithLength: function(length) {
				return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
			}.bind(this),
			chunk: {
				id: "\" + chunkId + \""
			}
		});
		var currentHotUpdateMainFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateMainFilename), {
			hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
			hashWithLength: function(length) {
				return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
			}.bind(this)
		});

		return source + "\n" +
			"var parentHotUpdateCallback = this[" + JSON.stringify(hotUpdateFunction) + "];\n" +
			"this[" + JSON.stringify(hotUpdateFunction) + "] = " + Template.getFunctionContent(require("./JsonpMainTemplate.runtime.js"))
			.replace(/\$require\$/g, this.requireFn)
			.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
			.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
			.replace(/\$hash\$/g, JSON.stringify(hash));
	});
	mainTemplate.plugin("hash", function(hash) {
		hash.update("jsonp");
		hash.update("4");
		hash.update(this.outputOptions.filename + "");
		hash.update(this.outputOptions.chunkFilename + "");
		hash.update(this.outputOptions.jsonpFunction + "");
		hash.update(this.outputOptions.library + "");
	});
};
