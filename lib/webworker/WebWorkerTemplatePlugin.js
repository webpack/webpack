/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ArrayPushCallbackChunkFormatPlugin from "../javascript/ArrayPushCallbackChunkFormatPlugin.js";
import EnableChunkLoadingPlugin from "../javascript/EnableChunkLoadingPlugin.js";
/** @typedef {import("../Compiler.js").default} Compiler */

class WebWorkerTemplatePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.options.output.chunkLoading = "import-scripts";
		new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
		new EnableChunkLoadingPlugin("import-scripts").apply(compiler);
	}
}

export default WebWorkerTemplatePlugin;

export { WebWorkerTemplatePlugin as "module.exports" };
