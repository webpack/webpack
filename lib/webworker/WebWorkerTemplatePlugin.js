/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ArrayPushCallbackChunkFormatPlugin = require("../javascript/ArrayPushCallbackChunkFormatPlugin");
const ImportScriptChunkLoadingPlugin = require("./ImportScriptChunkLoadingPlugin");

/** @typedef {import("../Compiler")} Compiler */

class WebWorkerTemplatePlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.options.output.chunkLoading = "importScripts";
		new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
		new ImportScriptChunkLoadingPlugin().apply(compiler);
	}
}
module.exports = WebWorkerTemplatePlugin;
