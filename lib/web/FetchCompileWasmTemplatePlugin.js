/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const WasmMainTemplatePlugin = require("../wasm/WasmMainTemplatePlugin");

class FetchCompileWasmTemplatePlugin {
	constructor(options) {
		this.options = options || {};
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FetchCompileWasmTemplatePlugin",
			compilation => {
				const mainTemplate = compilation.mainTemplate;
				const generateLoadBinaryCode = path =>
					`fetch(${RuntimeGlobals.publicPath} + ${path})`;

				const plugin = new WasmMainTemplatePlugin(
					compilation,
					Object.assign(
						{
							generateLoadBinaryCode,
							supportsStreaming: true
						},
						this.options
					)
				);
				plugin.apply(mainTemplate);
			}
		);
	}
}

module.exports = FetchCompileWasmTemplatePlugin;
