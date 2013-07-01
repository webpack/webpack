/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HotUpdateChunkTemplate = require("./HotUpdateChunkTemplate");

function JsonpHotUpdateChunkTemplate(outputOptions) {
	HotUpdateChunkTemplate.call(this, outputOptions);
}
module.exports = JsonpHotUpdateChunkTemplate;

JsonpHotUpdateChunkTemplate.prototype = Object.create(HotUpdateChunkTemplate.prototype);
JsonpHotUpdateChunkTemplate.prototype.renderHeader = function(id, modules, hash) {
	var buf = HotUpdateChunkTemplate.prototype.renderHeader.call(this, id, modules, hash);
	var jsonpFunction = this.outputOptions.hotUpdateFunction || ("webpackHotUpdate" + (this.outputOptions.library || ""));
	buf.unshift(jsonpFunction + "(" + JSON.stringify(id) + ",");
	return buf;
};

JsonpHotUpdateChunkTemplate.prototype.renderFooter = function(id, modules, hash) {
	var buf = HotUpdateChunkTemplate.prototype.renderFooter.call(this, id, modules, hash);
	buf.push(")");
	return buf;
};

JsonpHotUpdateChunkTemplate.prototype.updateHash = function(hash) {
	HotUpdateChunkTemplate.prototype.updateHash.call(this, hash);
	hash.update("JsonpHotUpdateChunkTemplate");
	hash.update("3");
	hash.update(this.outputOptions.hotUpdateFunction + "");
	hash.update(this.outputOptions.library + "");
};