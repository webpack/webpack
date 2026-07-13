/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import JavascriptModulesPlugin from "./javascript/JavascriptModulesPlugin.js";
/** @typedef {import("../declarations/plugins/SourceMapDevToolPlugin.js").SourceMapDevToolPluginOptions} SourceMapDevToolPluginOptions */
/** @typedef {import("./Compilation.js").default} Compilation */

const PLUGIN_NAME = "SourceMapDevToolModuleOptionsPlugin";

class SourceMapDevToolModuleOptionsPlugin {
	/**
	 * Creates an instance of SourceMapDevToolModuleOptionsPlugin.
	 * @param {SourceMapDevToolPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {SourceMapDevToolPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compilation} compilation the compiler instance
	 * @returns {void}
	 */
	apply(compilation) {
		const options = this.options;
		const sourceMapKind = options.module !== false ? "full" : "simple";
		compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
			module.sourceMapKind = sourceMapKind;
		});
		compilation.hooks.runtimeModule.tap(PLUGIN_NAME, (module) => {
			module.sourceMapKind = sourceMapKind;
		});
		JavascriptModulesPlugin.getCompilationHooks(compilation).useSourceMap.tap(
			PLUGIN_NAME,
			() => true
		);
	}
}

export default SourceMapDevToolModuleOptionsPlugin;

export { SourceMapDevToolModuleOptionsPlugin as "module.exports" };
