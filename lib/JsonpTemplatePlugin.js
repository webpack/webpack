/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var JsonpMainTemplate = require("./JsonpMainTemplate");
var JsonpChunkTemplate = require("./JsonpChunkTemplate");
var JsonpHotUpdateChunkTemplate = require("./JsonpHotUpdateChunkTemplate");

function JsonpTemplatePlugin(options) {
	this.options = options;
}
module.exports = JsonpTemplatePlugin;
JsonpTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.mainTemplate = new JsonpMainTemplate(options);
	compiler.chunkTemplate = new JsonpChunkTemplate(options);
	compiler.hotUpdateChunkTemplate = new JsonpHotUpdateChunkTemplate(options);
};