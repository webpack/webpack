/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => {
						// Intentional no-op: the HTML parser will be implemented in a subsequent PR.
					});
				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => {
						// Intentional no-op: the HTML generator will be implemented in a subsequent PR.
					});
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
