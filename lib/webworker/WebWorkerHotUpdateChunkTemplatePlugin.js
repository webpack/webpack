/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("../Template");

class WebWorkerHotUpdateChunkTemplatePlugin {

	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, removedModules, hash, id) {
			const chunkCallbackName = this.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (this.outputOptions.library || ""));
			const source = new ConcatSource();
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
	}
}
module.exports = WebWorkerHotUpdateChunkTemplatePlugin;
