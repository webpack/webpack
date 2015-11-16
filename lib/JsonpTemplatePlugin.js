/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var JsonpMainTemplatePlugin = require("./JsonpMainTemplatePlugin");
var JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");
var JsonpHotUpdateChunkTemplatePlugin = require("./JsonpHotUpdateChunkTemplatePlugin");

function JsonpTemplatePlugin() {}
module.exports = JsonpTemplatePlugin;
JsonpTemplatePlugin.prototype.apply = function(compiler) {
	compiler.plugin("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new JsonpMainTemplatePlugin());
		compilation.chunkTemplate.apply(new JsonpChunkTemplatePlugin());
		compilation.hotUpdateChunkTemplate.apply(new JsonpHotUpdateChunkTemplatePlugin());
	});
};
