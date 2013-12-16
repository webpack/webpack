/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HotUpdateChunkTemplate = require("../HotUpdateChunkTemplate");

function NodeHotUpdateChunkTemplate(outputOptions) {
	HotUpdateChunkTemplate.call(this, outputOptions);
}
module.exports = NodeHotUpdateChunkTemplate;

NodeHotUpdateChunkTemplate.prototype = Object.create(HotUpdateChunkTemplate.prototype);
NodeHotUpdateChunkTemplate.prototype.renderHeader = function(id, modules, hash) {
	var buf = HotUpdateChunkTemplate.prototype.renderHeader.call(this, id, modules, hash);
	buf.unshift(
		"exports.id = " + JSON.stringify(id) + ";\n",
		"exports.modules = "
	);
	return buf;
};

NodeHotUpdateChunkTemplate.prototype.updateHash = function(hash) {
	HotUpdateChunkTemplate.prototype.updateHash.call(this, hash);
	hash.update("NodeHotUpdateChunkTemplate");
	hash.update("3");
	hash.update(this.outputOptions.hotUpdateFunction + "");
	hash.update(this.outputOptions.library + "");
};