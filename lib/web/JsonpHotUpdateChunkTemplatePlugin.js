/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../HotUpdateChunkTemplate")} HotUpdateChunkTemplate */

class JsonpHotUpdateChunkTemplatePlugin {
	/**
	 * @param {HotUpdateChunkTemplate} hotUpdateChunkTemplate the hot update chunk template
	 * @returns {void}
	 */
	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.hooks.render.tap(
			"JsonpHotUpdateChunkTemplatePlugin",
			(modulesSource, moduleTemplate, { chunk }) => {
				const source = new ConcatSource();
				source.add(
					`${
						hotUpdateChunkTemplate.outputOptions.hotUpdateFunction
					}(${JSON.stringify(chunk.id)},`
				);
				source.add(modulesSource);
				source.add(")");
				return source;
			}
		);
		hotUpdateChunkTemplate.hooks.hash.tap(
			"JsonpHotUpdateChunkTemplatePlugin",
			hash => {
				hash.update("JsonpHotUpdateChunkTemplatePlugin");
				hash.update("3");
				hash.update(
					`${hotUpdateChunkTemplate.outputOptions.hotUpdateFunction}`
				);
				hash.update(`${hotUpdateChunkTemplate.outputOptions.library}`);
			}
		);
	}
}

module.exports = JsonpHotUpdateChunkTemplatePlugin;
