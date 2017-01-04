"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConcatSource = require("webpack-sources").ConcatSource;
class JsonpHotUpdateChunkTemplatePlugin {
	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.plugin("render", function(modulesSource, modules, removedModules, hash, id) {
			const jsonpFunction = this.outputOptions.hotUpdateFunction;
			const source = new ConcatSource();
			source.add(`${jsonpFunction}(${JSON.stringify(id)},`);
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
