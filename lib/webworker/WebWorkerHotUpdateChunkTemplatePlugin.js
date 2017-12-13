/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("../Template");

class WebWorkerHotUpdateChunkTemplatePlugin {

	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.hooks.render.tap("WebWorkerHotUpdateChunkTemplatePlugin", (modulesSource, modules, removedModules, hash, id) => {
			const chunkCallbackName = hotUpdateChunkTemplate.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (hotUpdateChunkTemplate.outputOptions.library || ""));
			const source = new ConcatSource();
			source.add(chunkCallbackName + "(" + JSON.stringify(id) + ",");
			source.add(modulesSource);
			source.add(")");
			return source;
		});
		hotUpdateChunkTemplate.hooks.hash.tap("WebWorkerHotUpdateChunkTemplatePlugin", hash => {
			hash.update("WebWorkerHotUpdateChunkTemplatePlugin");
			hash.update("3");
			hash.update(hotUpdateChunkTemplate.outputOptions.hotUpdateFunction + "");
			hash.update(hotUpdateChunkTemplate.outputOptions.library + "");
		});
	}
}
module.exports = WebWorkerHotUpdateChunkTemplatePlugin;
