/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ReadFileCompileWasmMainTemplatePlugin = require("./ReadFileCompileWasmMainTemplatePlugin");
const ReadFileCompileWasmModuleTemplatePlugin = require("./ReadFileCompileWasmModuleTemplatePlugin");

class ReadFileCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.plugin("this-compilation", (compilation) => {
			compilation.mainTemplate.apply(new ReadFileCompileWasmMainTemplatePlugin());
			compilation.moduleTemplates.javascript.apply(new ReadFileCompileWasmModuleTemplatePlugin());
		});
	}
}

module.exports = ReadFileCompileWasmTemplatePlugin;
