/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ReadFileCompileWasmMainTemplatePlugin = require("./ReadFileCompileWasmMainTemplatePlugin");
const WasmModuleTemplatePlugin = require("../wasm/WasmModuleTemplatePlugin");

class ReadFileCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ReadFileCompileWasmTemplatePlugin",
			compilation => {
				new ReadFileCompileWasmMainTemplatePlugin().apply(
					compilation.mainTemplate
				);
				new WasmModuleTemplatePlugin().apply(
					compilation.moduleTemplates.javascript
				);
			}
		);
	}
}

module.exports = ReadFileCompileWasmTemplatePlugin;
