/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

/**
 * @import {
 * 	SourceMapDevToolPluginOptions
 * } from "../../declarations/plugins/SourceMapDevToolPlugin"
 */
/** @import Compilation from "../Compilation" */

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
		if (options.scopes) {
			const { dependencyTemplates } = compilation;
			dependencyTemplates.importBindingScopes = true;
			// Code generation cached by a build without scopes carries no binding
			// expressions, and nothing else in its key says the devtool changed.
			dependencyTemplates.updateHash("source-map-scopes");
		}
		if (options.module !== false) {
			compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
				module.useSourceMap = true;
			});
			compilation.hooks.runtimeModule.tap(PLUGIN_NAME, (module) => {
				module.useSourceMap = true;
			});
		} else {
			compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
				module.useSimpleSourceMap = true;
			});
			compilation.hooks.runtimeModule.tap(PLUGIN_NAME, (module) => {
				module.useSimpleSourceMap = true;
			});
		}
		JavascriptModulesPlugin.getCompilationHooks(compilation).useSourceMap.tap(
			PLUGIN_NAME,
			() => true
		);
	}
}

module.exports = SourceMapDevToolModuleOptionsPlugin;
