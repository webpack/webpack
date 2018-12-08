/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */

const getEntryInfo = chunk => {
	if (!chunk.entryModule) {
		return [];
	}

	// We need only first group from iterable collection
	const firstGroup = chunk.groupsIterable.values().next().value;
	const result = [chunk.entryModule.id];
	for (const c of firstGroup.chunks) {
		if (c !== chunk) {
			result.push(c.id);
		}
	}

	return [result];
};

class JsonpChunkTemplatePlugin {
	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		const jsonpFunction = chunkTemplate.outputOptions.jsonpFunction;
		const jsonpFunctionStringified = JSON.stringify(jsonpFunction);
		const globalObject = chunkTemplate.outputOptions.globalObject;
		const initArrayTemplate = `(${globalObject}[${jsonpFunctionStringified}] = ${globalObject}[${jsonpFunctionStringified}] || [])`;

		chunkTemplate.hooks.render.tap(
			"JsonpChunkTemplatePlugin",
			(modules, chunk) => {
				const source = new ConcatSource();
				const prefetchChunks = chunk.getChildIdsByOrders().prefetch;
				source.add(`${initArrayTemplate}.push([${JSON.stringify(chunk.ids)},`);
				source.add(modules);
				const entries = getEntryInfo(chunk);
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
			hash.update(`${jsonpFunction}`);
			hash.update(`${globalObject}`);
		});
		chunkTemplate.hooks.hashForChunk.tap(
			"JsonpChunkTemplatePlugin",
			(hash, chunk) => {
				hash.update(JSON.stringify(getEntryInfo(chunk)));
				hash.update(JSON.stringify(chunk.getChildIdsByOrders().prefetch) || "");
			}
		);
	}
}
module.exports = JsonpChunkTemplatePlugin;
