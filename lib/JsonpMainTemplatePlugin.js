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
				"// object to store loaded and loading chunks",
				"// \"0\" means \"already loaded\"",
				"// Array means \"loading\", array contains callbacks",
				"var installedChunks = {",
				this.indent(
					chunk.ids.map(function(id) {
						return id + ":0";
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
		return this.asString([
			"// \"0\" is the signal for \"already loaded\"",
			"if(installedChunks[chunkId] === 0)",
			this.indent("return callback.call(null, " + this.requireFn + ");"),
			"",
			"// an array means \"currently loading\".",
			"if(installedChunks[chunkId] !== undefined) {",
			this.indent("installedChunks[chunkId].push(callback);"),
			"} else {",
			this.indent([
				"// start chunk loading",
				"installedChunks[chunkId] = [callback];",
				"var head = document.getElementsByTagName('head')[0];",
				"var script = document.createElement('script');",
				"script.type = 'text/javascript';",
				"script.charset = 'utf-8';",
				"script.async = true;",
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
				"head.appendChild(script);"
			]),
			"}"
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
				"window[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules) {",
				this.indent([
					"// add \"moreModules\" to the modules object,",
					"// then flag all \"chunkIds\" as loaded and fire callback",
					"var moduleId, chunkId, i = 0, callbacks = [];",
					"for(;i < chunkIds.length; i++) {",
					this.indent([
						"chunkId = chunkIds[i];",
						"if(installedChunks[chunkId])",
						this.indent("callbacks.push.apply(callbacks, installedChunks[chunkId]);"),
						"installedChunks[chunkId] = 0;"
					]),
					"}",
					"for(moduleId in moreModules) {",
					this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
					"}",
					"if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);",
					"while(callbacks.length)",
					this.indent("callbacks.shift().call(null, " + this.requireFn + ");"), (this.entryPointInChildren(chunk) ? [
						"if(moreModules[0]) {",
						this.indent([
							"installedModules[0] = 0;",
							"return " + this.requireFn + "(0);"
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
