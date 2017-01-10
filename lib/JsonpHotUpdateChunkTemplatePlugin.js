/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class JsonpHotUpdateChunkTemplatePlugin {
	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, removedModules, hash, id) {
			const source = new ConcatSource();
			source.add(`${this.outputOptions.hotUpdateFunction}(${JSON.stringify(id)},`);
			source.add(modulesSource);
			source.add(")");
			return source;
		});
		hotUpdateChunkTemplate.plugin("hash", function(hash) {
			hash.update("JsonpHotUpdateChunkTemplatePlugin");
			hash.update("3");
			hash.update(`${this.outputOptions.hotUpdateFunction}`);
			hash.update(`${this.outputOptions.library}`);
		});
	}
}

module.exports = JsonpHotUpdateChunkTemplatePlugin;
