/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;
var Template = require("./Template");

function JsonpHotUpdateChunkTemplatePlugin() {}
module.exports = JsonpHotUpdateChunkTemplatePlugin;

JsonpHotUpdateChunkTemplatePlugin.prototype.apply = function(hotUpdateChunkTemplate) {
	hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, removedModules, hash, id) {
		var jsonpFunction = this.outputOptions.hotUpdateFunction;
		var source = new ConcatSource();
		source.add(jsonpFunction + "(" + JSON.stringify(id) + ",");
		source.add(modulesSource);
		source.add(")");
		return source;
	});
	hotUpdateChunkTemplate.plugin("hash", function(hash) {
		hash.update("JsonpHotUpdateChunkTemplatePlugin");
		hash.update("3");
		hash.update(this.outputOptions.hotUpdateFunction + "");
		hash.update(this.outputOptions.library + "");
	});
};
