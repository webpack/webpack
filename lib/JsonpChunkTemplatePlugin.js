/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class JsonpChunkTemplatePlugin {
	apply(chunkTemplate) {
		chunkTemplate.plugin("render", function(modules, chunk) {
			const jsonpFunction = this.outputOptions.jsonpFunction;
			const source = new ConcatSource();
			source.add(`(window[${JSON.stringify(jsonpFunction)}] = window[${JSON.stringify(jsonpFunction)}] || []).push([${JSON.stringify(chunk.ids)},`);
			source.add(modules);
			const entries = [chunk.entryModule]
				.filter(Boolean)
				.map(m => [m.id].concat(chunk.getEntrypoints()[0].chunks.map(c => c.id)));
			if(entries.length > 0) {
				source.add(`,${JSON.stringify(entries)}`);
			}
			source.add("])");
			return source;
		});
		chunkTemplate.plugin("hash", function(hash) {
			hash.update("JsonpChunkTemplatePlugin");
			hash.update("4");
			hash.update(`${this.outputOptions.jsonpFunction}`);
			hash.update(`${this.outputOptions.library}`);
		});
	}
}
module.exports = JsonpChunkTemplatePlugin;
