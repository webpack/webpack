/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
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
			(modules, moduleTemplate, renderContext) => {
				const { chunk, chunkGraph } = renderContext;
				const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
				const globalObject = chunkTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
				const runtimePart =
					runtimeModules.length > 0 &&
					Template.renderChunkRuntimeModules(runtimeModules, renderContext);
				if (hotUpdateChunk) {
					const jsonpFunction = chunkTemplate.outputOptions.hotUpdateFunction;
					source.add(`${globalObject}[${JSON.stringify(jsonpFunction)}](`);
					source.add(`${JSON.stringify(chunk.id)},`);
					source.add(modules);
					if (runtimePart) {
						source.add(",\n");
						source.add(runtimePart);
					}
					source.add(")");
				} else {
					const jsonpFunction = chunkTemplate.outputOptions.jsonpFunction;
					source.add(
						`(${globalObject}[${JSON.stringify(
							jsonpFunction
						)}] = ${globalObject}[${JSON.stringify(
							jsonpFunction
						)}] || []).push([`
					);
					source.add(`${JSON.stringify(chunk.ids)},`);
					source.add(modules);
					const entries = getEntryInfo(chunkGraph, chunk);
					const prefetchChunks = chunk.getChildIdsByOrders(chunkGraph).prefetch;
					const entriesPart =
						entries.length > 0 && `,${JSON.stringify(entries)}`;
					const prefetchPart =
						prefetchChunks &&
						prefetchChunks.length > 0 &&
						`,${JSON.stringify(prefetchChunks)}`;
					if (entriesPart || runtimePart || prefetchPart) {
						source.add(entriesPart || ",0");
					}
					if (runtimePart || prefetchPart) {
						source.add(",\n");
						source.add(runtimePart || "0");
					}
					if (prefetchPart) {
						source.add(prefetchPart);
					}
					source.add("])");
				}
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
