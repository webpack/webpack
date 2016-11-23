/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;

function NodeChunkTemplatePlugin() {}
module.exports = NodeChunkTemplatePlugin;

NodeChunkTemplatePlugin.prototype.apply = function(chunkTemplate) {
	chunkTemplate.plugin("render", function(modules, chunk) {
		var source = new ConcatSource();
		source.add("exports.ids = " + JSON.stringify(chunk.ids) + ";\nexports.modules = ");
		source.add(modules);
		source.add(";");
		return source;
	});
	chunkTemplate.plugin("hash", function(hash) {
		hash.update("node");
		hash.update("3");
	});
};
