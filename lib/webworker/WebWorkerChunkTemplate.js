/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function WebWorkerChunkTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = WebWorkerChunkTemplate;

WebWorkerChunkTemplate.prototype.render = function(chunk, moduleTemplate, dependencyTemplates) {
	var chunkCallbackName = this.outputOptions.chunkCallbackName || ("webpackChunk" + (this.outputOptions.library || ""));
	var buf = [];
	buf.push(chunkCallbackName + "({\n");
	chunk.modules.forEach(function(module, idx) {
		if(idx != 0) buf.push(",\n");
		buf.push("\n/***/ " + module.id + ":\n");
		var source = moduleTemplate.render(module, dependencyTemplates);
		buf.push(source.source());
	});
	buf.push("\n\n})");
	return new RawSource(buf.join(""));
};

WebWorkerChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("webworker");
	hash.update("1");
	hash.update(this.outputOptions.chunkCallbackName + "");
	hash.update(this.outputOptions.library + "");
};