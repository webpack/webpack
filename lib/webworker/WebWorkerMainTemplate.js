/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var MainTemplate = require("../MainTemplate");
var Template = require("../Template");

function WebWorkerMainTemplate(outputOptions) {
	MainTemplate.call(this, outputOptions);
}
module.exports = WebWorkerMainTemplate;

WebWorkerMainTemplate.prototype = Object.create(MainTemplate.prototype);

WebWorkerMainTemplate.prototype.renderLocalVars = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderLocalVars.call(this, hash, chunk);
	if(chunk.chunks.length > 0) {
		buf.push(
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
		);
	}
	return buf;
};

WebWorkerMainTemplate.prototype.renderRequireEnsure = function(hash, chunk) {
	var filename = this.outputOptions.filename || "bundle.js";
	var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
	return [
		"// \"1\" is the signal for \"already loaded\"",
		"if(!installedChunks[chunkId]) {",
		this.indent([
			"importScripts(" +
				JSON.stringify(chunkFilename
					.replace(Template.REGEXP_NAME, ""))
				.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"")
				.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ");"
		]),
		"}",
		"callback.call(null, " + this.requireFn + ");"
	];
};

WebWorkerMainTemplate.prototype.renderInit = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderInit.call(this, hash, chunk);
	if(chunk.chunks.length > 0) {
		var chunkCallbackName = this.outputOptions.chunkCallbackName || ("webpackChunk" + (this.outputOptions.library || ""));
		buf.push(
			"this[" + JSON.stringify(chunkCallbackName) + "] = function webpackChunkCallback(chunkIds, moreModules) {",
			this.indent([
				"for(var moduleId in moreModules) {",
				this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
				"}",
				"while(chunkIds.length)",
				this.indent("installedChunks[chunkIds.pop()] = 1;")
			]),
			"};"
		);
	}
	return buf;
};

WebWorkerMainTemplate.prototype.renderCurrentHashCode = function(hash) {
	return JSON.stringify(hash);
};

WebWorkerMainTemplate.prototype.updateHash = function(hash) {
	MainTemplate.prototype.updateHash.call(this, hash);
	hash.update("webworker");
	hash.update("3");
	hash.update(this.outputOptions.publicPath + "");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
	hash.update(this.outputOptions.chunkCallbackName + "");
	hash.update(this.outputOptions.library + "");
};