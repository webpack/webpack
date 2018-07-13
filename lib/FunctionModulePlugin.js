/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");

/** @typedef {import("./Compiler")} Compiler */

class FunctionModulePlugin {
	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FunctionModulePlugin", compilation => {
			new FunctionModuleTemplatePlugin().apply(
				compilation.moduleTemplates.javascript
			);
		});
	}
}

module.exports = FunctionModulePlugin;
