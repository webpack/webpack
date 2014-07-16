/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("../Template");

function WebWorkerMainTemplatePlugin() {
}
module.exports = WebWorkerMainTemplatePlugin;

WebWorkerMainTemplatePlugin.prototype.apply = function(mainTemplate) {
	mainTemplate.plugin("local-vars", function(source, chunk, hash) {
		if(chunk.chunks.length > 0) {
			return this.asString([
				source,
				"",
				"// object to store loaded chunks",
				'// "1" means "already loaded"',
				"var installedChunks = {",
				this.indent(
					chunk.ids.map(function(id) {
						return id + ":1"
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
		return this.asString([
			"// \"1\" is the signal for \"already loaded\"",
			"if(!installedChunks[chunkId]) {",
			this.indent([
				"importScripts(" +
					JSON.stringify(chunkFilename
						.replace(Template.REGEXP_NAME, "(not implemented)")
						.replace(Template.REGEXP_CHUNKHASH, "(not implemented)"))
					.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"")
					.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ");"
			]),
			"}",
			"callback.call(null, " + this.requireFn + ");"
		]);
	});
	mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
		if(chunk.chunks.length > 0) {
			var chunkCallbackName = this.outputOptions.chunkCallbackName || ("webpackChunk" + (this.outputOptions.library || ""));
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
	mainTemplate.plugin("hash", function(hash) {
		hash.update("webworker");
		hash.update("3");
		hash.update(this.outputOptions.publicPath + "");
		hash.update(this.outputOptions.filename + "");
		hash.update(this.outputOptions.chunkFilename + "");
		hash.update(this.outputOptions.chunkCallbackName + "");
		hash.update(this.outputOptions.library + "");
	});
};
