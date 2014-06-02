/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var JsonpMainTemplatePlugin = require("./JsonpMainTemplatePlugin");
var JsonpChunkTemplate = require("./JsonpChunkTemplate");
var JsonpHotUpdateChunkTemplate = require("./JsonpHotUpdateChunkTemplate");

function JsonpTemplatePlugin(options) {
	this.options = options;
}
module.exports = JsonpTemplatePlugin;
JsonpTemplatePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new JsonpMainTemplatePlugin());
	});
	compiler.chunkTemplate = new JsonpChunkTemplate(options);
	compiler.hotUpdateChunkTemplate = new JsonpHotUpdateChunkTemplate(options);
};