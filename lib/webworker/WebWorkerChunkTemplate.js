/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ChunkTemplate = require("../ChunkTemplate");

function WebWorkerChunkTemplate(outputOptions) {
	ChunkTemplate.call(this, outputOptions);
}
module.exports = WebWorkerChunkTemplate;

WebWorkerChunkTemplate.prototype = Object.create(ChunkTemplate.prototype);
WebWorkerChunkTemplate.prototype.renderHeader = function(chunk) {
	var buf = ChunkTemplate.prototype.renderHeader.call(this, chunk);
	var chunkCallbackName = this.outputOptions.chunkCallbackName || ("webpackChunk" + (this.outputOptions.library || ""));
	buf.unshift(chunkCallbackName + "(" + JSON.stringify(chunk.ids) + ",");
	return buf;
};

WebWorkerChunkTemplate.prototype.renderFooter = function(chunk) {
	var buf = ChunkTemplate.prototype.renderFooter.call(this, chunk);
	buf.push(")");
	return buf;
};

WebWorkerChunkTemplate.prototype.updateHash = function(hash) {
	ChunkTemplate.prototype.updateHash.call(this, hash);
	hash.update("webworker");
	hash.update("3");
	hash.update(this.outputOptions.chunkCallbackName + "");
	hash.update(this.outputOptions.library + "");
};