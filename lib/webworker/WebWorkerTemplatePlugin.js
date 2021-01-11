/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebWorkerMainTemplatePlugin = require("./WebWorkerMainTemplatePlugin");
const WebWorkerChunkTemplatePlugin = require("./WebWorkerChunkTemplatePlugin");
const WebWorkerHotUpdateChunkTemplatePlugin = require("./WebWorkerHotUpdateChunkTemplatePlugin");

class WebWorkerTemplatePlugin {
	constructor(options) {
		options = options || {};
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WebWorkerTemplatePlugin",
			compilation => {
				new WebWorkerMainTemplatePlugin(this.asyncChunkLoading).apply(
					compilation.mainTemplate
				);
				new WebWorkerChunkTemplatePlugin().apply(compilation.chunkTemplate);
				new WebWorkerHotUpdateChunkTemplatePlugin().apply(
					compilation.hotUpdateChunkTemplate
				);
			}
		);
	}
}
module.exports = WebWorkerTemplatePlugin;
