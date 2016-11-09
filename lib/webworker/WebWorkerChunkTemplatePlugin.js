/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("../Template");

function WebWorkerChunkTemplatePlugin() {}
module.exports = WebWorkerChunkTemplatePlugin;

WebWorkerChunkTemplatePlugin.prototype.apply = function(chunkTemplate) {
	chunkTemplate.plugin("render", function(modules, chunk) {
		var chunkCallbackName = this.outputOptions.chunkCallbackName || Template.toIdentifier("webpackChunk" + (this.outputOptions.library || ""));
		var source = new ConcatSource();
		source.add(chunkCallbackName + "(" + JSON.stringify(chunk.ids) + ",");
		source.add(modules);
		source.add(")");
		return source;
	});
	chunkTemplate.plugin("hash", function(hash) {
		hash.update("webworker");
		hash.update("3");
		hash.update(this.outputOptions.chunkCallbackName + "");
		hash.update(this.outputOptions.library + "");
	});
};
