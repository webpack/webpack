/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ChunkTemplate = require("./ChunkTemplate");

function JsonpChunkTemplate(outputOptions) {
	ChunkTemplate.call(this, outputOptions);
}
module.exports = JsonpChunkTemplate;

JsonpChunkTemplate.prototype = Object.create(ChunkTemplate.prototype);
JsonpChunkTemplate.prototype.renderHeader = function(chunk) {
	var buf = ChunkTemplate.prototype.renderHeader.call(this, chunk);
	var jsonpFunction = this.outputOptions.jsonpFunction || ("webpackJsonp" + (this.outputOptions.library || ""));
	buf.unshift(jsonpFunction + "(" + JSON.stringify(chunk.ids) + ",");
	return buf;
};

JsonpChunkTemplate.prototype.renderFooter = function(chunk) {
	var buf = ChunkTemplate.prototype.renderFooter.call(this, chunk);
	buf.push(")");
	return buf;
};

JsonpChunkTemplate.prototype.updateHash = function(hash) {
	ChunkTemplate.prototype.updateHash.call(this, hash);
	hash.update("JsonpChunkTemplate");
	hash.update("3");
	hash.update(this.outputOptions.jsonpFunction + "");
	hash.update(this.outputOptions.library + "");
};