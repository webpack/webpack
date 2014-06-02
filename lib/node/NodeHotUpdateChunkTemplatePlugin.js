/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function NodeHotUpdateChunkTemplatePlugin() {
}
module.exports = NodeHotUpdateChunkTemplatePlugin;

NodeHotUpdateChunkTemplatePlugin.prototype.apply = function(hotUpdateChunkTemplate) {
	hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, hash, id) {
		var source = new ConcatSource();
		source.add("exports.id = " + JSON.stringify(id) + ";\nexports.modules = ");
		source.add(modulesSource);
		source.add(";");
		return source;
	});
	hotUpdateChunkTemplate.plugin("hash", function(hash) {
		hash.update("NodeHotUpdateChunkTemplatePlugin");
		hash.update("3");
		hash.update(this.outputOptions.hotUpdateFunction + "");
		hash.update(this.outputOptions.library + "");
	});
};
