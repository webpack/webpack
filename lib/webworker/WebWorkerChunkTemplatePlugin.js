/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */

class WebWorkerChunkTemplatePlugin {
	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"WebWorkerChunkTemplatePlugin",
			(modules, moduleTemplate, { chunk }) => {
				const chunkCallbackName = chunkTemplate.outputOptions.chunkCallbackName;
				const globalObject = chunkTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				source.add(
					`${globalObject}[${JSON.stringify(
						chunkCallbackName
					)}](${JSON.stringify(chunk.ids)},`
				);
				source.add(modules);
				source.add(")");
				return source;
			}
		);
		chunkTemplate.hooks.hash.tap("WebWorkerChunkTemplatePlugin", hash => {
			hash.update("webworker");
			hash.update("3");
			hash.update(`${chunkTemplate.outputOptions.chunkCallbackName}`);
			hash.update(`${chunkTemplate.outputOptions.globalObject}`);
		});
	}
}
module.exports = WebWorkerChunkTemplatePlugin;
