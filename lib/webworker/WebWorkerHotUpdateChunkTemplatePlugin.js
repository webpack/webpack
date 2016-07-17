/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;
var Template = require("../Template");

function WebWorkerHotUpdateChunkTemplatePlugin() {}
module.exports = WebWorkerHotUpdateChunkTemplatePlugin;

WebWorkerHotUpdateChunkTemplatePlugin.prototype.apply = function(hotUpdateChunkTemplate) {
	hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, removedModules, hash, id) {
		var chunkCallbackName = this.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (this.outputOptions.library || ""));
		var source = new ConcatSource();
		source.add(chunkCallbackName + "(" + JSON.stringify(id) + ",");
		source.add(modulesSource);
		source.add(")");
		return source;
	});
	hotUpdateChunkTemplate.plugin("hash", function(hash) {
		hash.update("WebWorkerHotUpdateChunkTemplatePlugin");
		hash.update("3");
		hash.update(this.outputOptions.hotUpdateFunction + "");
		hash.update(this.outputOptions.library + "");
	});
};
