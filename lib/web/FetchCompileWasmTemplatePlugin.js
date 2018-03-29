/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FetchCompileWasmMainTemplatePlugin = require("./FetchCompileWasmMainTemplatePlugin");
const WasmModuleTemplatePlugin = require("../wasm/WasmModuleTemplatePlugin");

class FetchCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileWasmTemplatePlugin",
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

module.exports = FetchCompileWasmTemplatePlugin;
