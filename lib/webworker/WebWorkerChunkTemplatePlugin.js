/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */
/** @typedef {import("../Compilation")} Compilation */

class WebWorkerChunkTemplatePlugin {
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
			"WebWorkerChunkTemplatePlugin",
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
					source.add(modules);
					if (runtimePart) {
						source.add(",\n");
						source.add(runtimePart);
					}
					source.add(")");
				} else {
					const chunkCallbackName =
						chunkTemplate.outputOptions.chunkCallbackName;
					source.add(`${globalObject}[${JSON.stringify(chunkCallbackName)}](`);
					source.add(`${JSON.stringify(chunk.ids)},`);
					source.add(modules);
					if (runtimePart) {
						source.add(",\n");
						source.add(runtimePart);
					}
					source.add(")");
				}
				return source;
			}
		);
		chunkTemplate.hooks.hash.tap("WebWorkerChunkTemplatePlugin", hash => {
			hash.update("webworker");
			hash.update("4");
			hash.update(`${chunkTemplate.outputOptions.chunkCallbackName}`);
			hash.update(`${chunkTemplate.outputOptions.hotUpdateFunction}`);
			hash.update(`${chunkTemplate.outputOptions.globalObject}`);
		});
	}
}
module.exports = WebWorkerChunkTemplatePlugin;
