/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const Queue = require("../util/Queue");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const UnsupportedWebAssemblyFeatureError = require("../wasm/UnsupportedWebAssemblyFeatureError");

class WasmFinalizeExportsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("WasmFinalizeExportsPlugin", compilation => {
			compilation.hooks.finishModules.tap(
				"WasmFinalizeExportsPlugin",
				modules => {
					const queue = new Queue();

					let module;
					let jsIncompatibleExports = [];

					for (const module of modules) {
						if (module.buildMeta.jsIncompatibleExports) {
							jsIncompatibleExports.push(
								...module.buildMeta.jsIncompatibleExports
							);
						}

						queue.enqueue(module);
					}

					while (queue.length > 0) {
						module = queue.dequeue();

						// 1. if a non WebAssembly module
						if (module.type.startsWith("webassembly") === false) {
							for (const dep of module.dependencies) {
								// 2. imports a WebAssembly module
								// FIXME(sven): pseudo code from here
								if (dep.type === "webassembly") {
									// 3. if the used import is flaged as invalid
									if (jsIncompatibleExports.indexOf(dep.usedName)) {
										throw new UnsupportedWebAssemblyFeatureError(
											"JavaScript modules can not use WebAssembly export with an incompatible type signature"
										);
									}
								}
							}
						}
					}
				}
			);
		});
	}
}

module.exports = WasmFinalizeExportsPlugin;
