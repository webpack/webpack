/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");
const JsonpHotUpdateChunkTemplatePlugin = require("./JsonpHotUpdateChunkTemplatePlugin");
const JsonpMainTemplatePlugin = require("./JsonpMainTemplatePlugin");

class JsonpTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("JsonpTemplatePlugin", compilation => {
			new JsonpMainTemplatePlugin(compilation).apply(compilation.mainTemplate);
			new JsonpChunkTemplatePlugin(compilation).apply(
				compilation.chunkTemplate
			);
			new JsonpHotUpdateChunkTemplatePlugin().apply(
				compilation.hotUpdateChunkTemplate
			);
		});
	}
}

module.exports = JsonpTemplatePlugin;
