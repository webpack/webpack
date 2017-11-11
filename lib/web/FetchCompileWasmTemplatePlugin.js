/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FetchCompileWasmMainTemplatePlugin = require("./FetchCompileWasmMainTemplatePlugin");
const FetchCompileWasmModuleTemplatePlugin = require("./FetchCompileWasmModuleTemplatePlugin");

class FetchCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.plugin("this-compilation", (compilation) => {
			compilation.mainTemplate.apply(new FetchCompileWasmMainTemplatePlugin());
			compilation.moduleTemplates.javascript.apply(new FetchCompileWasmModuleTemplatePlugin());
		});
	}
}

module.exports = FetchCompileWasmTemplatePlugin;
