/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FetchCompileWasmMainTemplatePlugin = require("../web/FetchCompileWasmMainTemplatePlugin");
const WasmModuleTemplatePlugin = require("../wasm/WasmModuleTemplatePlugin");

class ReadFileCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ReadFileCompileWasmTemplatePlugin",
			compilation => {
				new FetchCompileWasmMainTemplatePlugin().apply(
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
