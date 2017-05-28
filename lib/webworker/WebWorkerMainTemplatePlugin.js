/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class WebWorkerMainTemplatePlugin {
	apply(mainTemplate) {
		mainTemplate.plugin("local-vars", function(source, chunk) {
			if(chunk.chunks.length > 0) {
				return this.asString([
					source,
					"",
					"// object to store loaded chunks",
					"// \"1\" means \"already loaded\"",
					"var installedChunks = {",
					this.indent(
						chunk.ids.map(function(id) {
							return id + ": 1";
						}).join(",\n")
					),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("require-ensure", function(_, chunk, hash) {
			const chunkFilename = this.outputOptions.chunkFilename;
			return this.asString([
				"return new Promise(function(resolve) {",
				this.indent([
					"// \"1\" is the signal for \"already loaded\"",
					"if(!installedChunks[chunkId]) {",
					this.indent([
						"importScripts(" +
						this.applyPluginsWaterfall("asset-path", JSON.stringify(chunkFilename), {
							hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
							hashWithLength: function(length) {
								return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
							}.bind(this),
							chunk: {
								id: "\" + chunkId + \""
							}
						}) + ");"
					]),
					"}",
					"resolve();"
				]),
				"});"
			]);
		});
		mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
			if(chunk.chunks.length > 0) {
				const chunkCallbackName = this.outputOptions.chunkCallbackName || Template.toIdentifier("webpackChunk" + (this.outputOptions.library || ""));
				return this.asString([
					source,
					"this[" + JSON.stringify(chunkCallbackName) + "] = function webpackChunkCallback(chunkIds, moreModules) {",
					this.indent([
						"for(var moduleId in moreModules) {",
						this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
						"}",
						"while(chunkIds.length)",
						this.indent("installedChunks[chunkIds.pop()] = 1;")
					]),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("hot-bootstrap", function(source, chunk, hash) {
			const hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
			const hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
			const hotUpdateFunction = this.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (this.outputOptions.library || ""));
			const currentHotUpdateChunkFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateChunkFilename), {
				hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
				hashWithLength: function(length) {
					return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
				}.bind(this),
				chunk: {
					id: "\" + chunkId + \""
				}
			});
			const currentHotUpdateMainFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateMainFilename), {
				hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
				hashWithLength: function(length) {
					return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
				}.bind(this)
			});

			return source + "\n" +
				"var parentHotUpdateCallback = this[" + JSON.stringify(hotUpdateFunction) + "];\n" +
				"this[" + JSON.stringify(hotUpdateFunction) + "] = " + Template.getFunctionContent(require("./WebWorkerMainTemplate.runtime.js"))
				.replace(/\/\/\$semicolon/g, ";")
				.replace(/\$require\$/g, this.requireFn)
				.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
				.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
				.replace(/\$hash\$/g, JSON.stringify(hash));
		});
		mainTemplate.plugin("hash", function(hash) {
			hash.update("webworker");
			hash.update("3");
			hash.update(`${this.outputOptions.publicPath}`);
			hash.update(`${this.outputOptions.filename}`);
			hash.update(`${this.outputOptions.chunkFilename}`);
			hash.update(`${this.outputOptions.chunkCallbackName}`);
			hash.update(`${this.outputOptions.library}`);
		});
	}
}
module.exports = WebWorkerMainTemplatePlugin;
