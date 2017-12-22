/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebAssemblyParser = require("./WebAssemblyParser");
const WebAssemblyImportDependency = require("./dependencies/WebAssemblyImportDependency");

class WebAssemblyModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("WebAssemblyModulesPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(WebAssemblyImportDependency, normalModuleFactory);

			normalModuleFactory.hooks.createParser.for("webassembly/experimental").tap("WebAssemblyModulesPlugin", () => {
				return new WebAssemblyParser();
			});
		});
	}
}

module.exports = WebAssemblyModulesPlugin;
