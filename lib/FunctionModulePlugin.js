/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");

class FunctionModulePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.moduleTemplates.javascript.apply(new FunctionModuleTemplatePlugin());
		});
	}
}

module.exports = FunctionModulePlugin;
