/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RawSource = require("webpack-sources").RawSource;

class FetchCompileWasmModuleTemplatePlugin {
	apply(moduleTemplate) {
		moduleTemplate.plugin("content", (moduleSource, module, {
			chunk
		}) => {
			if(module.type && module.type.startsWith("webassembly")) {
				if(chunk.isInitial())
					throw new Error("Sync WebAsssmbly compilation is not yet implemented");
				const source = new RawSource([
					"\"use strict\";",
					"",
					"// Instanciate WebAssembly module",
					"var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {});",
					"",
					"// export exports from WebAssmbly module",
					// TODO rewrite this to getters depending on exports to support circular dependencies
					"module.exports = instance.exports;"
				].join("\n"));
				return source;
			} else {
				return moduleSource;
			}
		});

		moduleTemplate.plugin("hash", hash => {
			hash.update("FetchCompileWasmModuleTemplatePlugin");
			hash.update("1");
		});
	}
}
module.exports = FetchCompileWasmModuleTemplatePlugin;
