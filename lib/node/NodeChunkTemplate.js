/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ChunkTemplate = require("../ChunkTemplate");

function NodeChunkTemplate(outputOptions) {
	ChunkTemplate.call(this, outputOptions);
}
module.exports = NodeChunkTemplate;

NodeChunkTemplate.prototype = Object.create(ChunkTemplate.prototype);
NodeChunkTemplate.prototype.renderHeader = function(chunk) {
	var buf = ChunkTemplate.prototype.renderHeader.call(this, chunk);
	buf.unshift(
		"exports.ids = " + JSON.stringify(chunk.ids) + ";\n",
		"exports.modules = "
	);
	return buf;
};

NodeChunkTemplate.prototype.updateHash = function(hash) {
	ChunkTemplate.prototype.updateHash.call(this, hash);
	hash.update("node");
	hash.update("3");
};