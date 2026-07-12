/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ArrayPushCallbackChunkFormatPlugin from "../javascript/ArrayPushCallbackChunkFormatPlugin.js";
import EnableChunkLoadingPlugin from "../javascript/EnableChunkLoadingPlugin.js";
import JsonpChunkLoadingRuntimeModule from "./JsonpChunkLoadingRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Compiler.js").default} Compiler */

// TODO webpack 6 remove this class
class JsonpTemplatePlugin {
	/**
	 * Returns hooks.
	 * @deprecated use JsonpChunkLoadingRuntimeModule.getCompilationHooks instead
	 * @param {Compilation} compilation the compilation
	 * @returns {import("./JsonpChunkLoadingRuntimeModule.js").JsonpCompilationPluginHooks} hooks
	 */
	static getCompilationHooks(compilation) {
		return JsonpChunkLoadingRuntimeModule.getCompilationHooks(compilation);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.options.output.chunkLoading = "jsonp";
		new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
		new EnableChunkLoadingPlugin("jsonp").apply(compiler);
	}
}

export default JsonpTemplatePlugin;

export { JsonpTemplatePlugin as "module.exports" };
