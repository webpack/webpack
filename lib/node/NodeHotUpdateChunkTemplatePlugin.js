/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../HotUpdateChunkTemplate")} HotUpdateChunkTemplate */

class NodeHotUpdateChunkTemplatePlugin {
	/**
	 * @param {HotUpdateChunkTemplate} hotUpdateChunkTemplate the hot update chunk template
	 * @returns {void}
	 */
	apply(hotUpdateChunkTemplate) {
		hotUpdateChunkTemplate.hooks.render.tap(
			"NodeHotUpdateChunkTemplatePlugin",
			(modulesSource, moduleTemplate, { chunk }) => {
				const source = new ConcatSource();
				source.add(
					"exports.id = " + JSON.stringify(chunk.id) + ";\nexports.modules = "
				);
				source.add(modulesSource);
				source.add(";");
				return source;
			}
		);
		hotUpdateChunkTemplate.hooks.hash.tap(
			"NodeHotUpdateChunkTemplatePlugin",
			hash => {
				hash.update("NodeHotUpdateChunkTemplatePlugin");
				hash.update("3");
				hash.update(
					hotUpdateChunkTemplate.outputOptions.hotUpdateFunction + ""
				);
				hash.update(hotUpdateChunkTemplate.outputOptions.library + "");
			}
		);
	}
}
module.exports = NodeHotUpdateChunkTemplatePlugin;
