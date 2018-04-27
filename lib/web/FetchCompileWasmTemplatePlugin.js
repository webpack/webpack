/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const FetchCompileWasmMainTemplatePlugin = require("./FetchCompileWasmMainTemplatePlugin");

class FetchCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileWasmTemplatePlugin",
			compilation => {
				new FetchCompileWasmMainTemplatePlugin().apply(
					compilation.mainTemplate
				);
			}
		);
	}
}

module.exports = FetchCompileWasmTemplatePlugin;
