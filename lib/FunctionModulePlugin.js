/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");

/** @typedef {import("./Compiler")} Compiler */

class FunctionModulePlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FunctionModulePlugin", compilation => {
			new FunctionModuleTemplatePlugin({
				compilation
			}).apply(compilation.moduleTemplates.javascript);
		});
	}
}

module.exports = FunctionModulePlugin;
