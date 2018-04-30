/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WasmMainTemplatePlugin = require("../wasm/WasmMainTemplatePlugin");

class FetchCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileWasmTemplatePlugin",
			compilation => {
				const mainTemplate = compilation.mainTemplate;
				const generateLoadBinaryCode = path =>
					`fetch(${mainTemplate.requireFn}.p + ${path})`;

				const plugin = new WasmMainTemplatePlugin(generateLoadBinaryCode, true);
				plugin.apply(mainTemplate);
			}
		);
	}
}

module.exports = FetchCompileWasmTemplatePlugin;
