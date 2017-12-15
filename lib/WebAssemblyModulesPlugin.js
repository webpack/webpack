/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebAssemblyParser = require("./WebAssemblyParser");

class WebAssemblyModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("WebAssemblyModulesPlugin", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.hooks.createParser.for("webassembly/experimental").tap("WebAssemblyModulesPlugin", () => {
				return new WebAssemblyParser();
			});
		});
	}
}

module.exports = WebAssemblyModulesPlugin;
