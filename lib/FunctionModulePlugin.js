/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");
const RequestShortener = require("./RequestShortener");

class FunctionModulePlugin {
	constructor(options, requestShortener) {
		this.options = options;
		this.requestShortener = requestShortener;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.moduleTemplate.requestShortener = this.requestShortener || new RequestShortener(compiler.context);
			compilation.moduleTemplate.apply(new FunctionModuleTemplatePlugin());
		});
	}
}

module.exports = FunctionModulePlugin;
