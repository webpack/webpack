/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebWorkerChunkTemplatePlugin = require("./WebWorkerChunkTemplatePlugin");
const WebWorkerHotUpdateChunkTemplatePlugin = require("./WebWorkerHotUpdateChunkTemplatePlugin");
const WebWorkerMainTemplatePlugin = require("./WebWorkerMainTemplatePlugin");

/** @typedef {import("../Compiler")} Compiler */

class WebWorkerTemplatePlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WebWorkerTemplatePlugin",
			compilation => {
				new WebWorkerMainTemplatePlugin().apply(compilation.mainTemplate);
				new WebWorkerChunkTemplatePlugin().apply(compilation.chunkTemplate);
				new WebWorkerHotUpdateChunkTemplatePlugin().apply(
					compilation.hotUpdateChunkTemplate
				);
			}
		);
	}
}
module.exports = WebWorkerTemplatePlugin;
