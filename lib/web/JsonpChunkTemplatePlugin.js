/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { ConcatSource } = require("webpack-sources");

class JsonpChunkTemplatePlugin {
	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"JsonpChunkTemplatePlugin",
			(modules, chunk) => {
				const jsonpFunction = chunkTemplate.outputOptions.jsonpFunction;
				const globalObject = chunkTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				const prefetchChunks = chunk.getChildIdsByOrders().prefetch;
				source.add(
					`(${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] = ${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] || []).push([${JSON.stringify(chunk.ids)},`
				);
				source.add(modules);
				const entries = [chunk.entryModule].filter(Boolean).map(m =>
					[m.id].concat(
						Array.from(chunk.groupsIterable)[0]
							.chunks.filter(c => c !== chunk)
							.map(c => c.id)
					)
				);
				if (entries.length > 0) {
					source.add(`,${JSON.stringify(entries)}`);
				} else if (prefetchChunks && prefetchChunks.length) {
					source.add(`,0`);
				}

				if (prefetchChunks && prefetchChunks.length) {
					source.add(`,${JSON.stringify(prefetchChunks)}`);
				}
				source.add("])");
				return source;
			}
		);
		chunkTemplate.hooks.hash.tap("JsonpChunkTemplatePlugin", hash => {
			hash.update("JsonpChunkTemplatePlugin");
			hash.update("4");
			hash.update(`${chunkTemplate.outputOptions.jsonpFunction}`);
			hash.update(`${chunkTemplate.outputOptions.globalObject}`);
		});
	}
}
module.exports = JsonpChunkTemplatePlugin;
