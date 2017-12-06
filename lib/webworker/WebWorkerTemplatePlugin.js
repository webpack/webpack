/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebWorkerMainTemplatePlugin = require("./WebWorkerMainTemplatePlugin");
const WebWorkerChunkTemplatePlugin = require("./WebWorkerChunkTemplatePlugin");
const WebWorkerHotUpdateChunkTemplatePlugin = require("./WebWorkerHotUpdateChunkTemplatePlugin");

class WebWorkerTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("WebWorkerTemplatePlugin", (compilation) => {
			compilation.mainTemplate.apply(new WebWorkerMainTemplatePlugin());
			compilation.chunkTemplate.apply(new WebWorkerChunkTemplatePlugin());
			compilation.hotUpdateChunkTemplate.apply(new WebWorkerHotUpdateChunkTemplatePlugin());
		});
	}
}
module.exports = WebWorkerTemplatePlugin;
