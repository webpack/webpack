/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const getEntryInfo = require("./JsonpHelpers").getEntryInfo;

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkTemplate")} ChunkTemplate */
/** @typedef {import("../Compilation")} Compilation */

class JsonpChunkTemplatePlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 */
	constructor(compilation) {
		this.compilation = compilation;
	}

	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"JsonpChunkTemplatePlugin",
			(modules, moduleTemplate, { chunk, chunkGraph }) => {
				const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
				const jsonpFunction = hotUpdateChunk
					? chunkTemplate.outputOptions.hotUpdateFunction
					: chunkTemplate.outputOptions.jsonpFunction;
				const globalObject = chunkTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				const prefetchChunks = chunk.getChildIdsByOrders(chunkGraph).prefetch;
				source.add(
					`(${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] = ${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] || []).push([${JSON.stringify(chunk.ids)},`
				);
				source.add(modules);
				const entries = getEntryInfo(chunkGraph, chunk);
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
			hash.update("5");
			hash.update(`${chunkTemplate.outputOptions.jsonpFunction}`);
			hash.update(`${chunkTemplate.outputOptions.hotUpdateFunction}`);
			hash.update(`${chunkTemplate.outputOptions.globalObject}`);
		});
		chunkTemplate.hooks.hashForChunk.tap(
			"JsonpChunkTemplatePlugin",
			(hash, chunk) => {
				const chunkGraph = this.compilation.chunkGraph;
				hash.update(JSON.stringify(getEntryInfo(chunkGraph, chunk)));
				hash.update(
					JSON.stringify(chunk.getChildIdsByOrders(chunkGraph).prefetch) || ""
				);
			}
		);
	}
}
module.exports = JsonpChunkTemplatePlugin;
