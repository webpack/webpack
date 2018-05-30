/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

const UnsupportedWebAssemblyFeatureError = require("../wasm/UnsupportedWebAssemblyFeatureError");

const error = new UnsupportedWebAssemblyFeatureError(
	"JavaScript modules can not use a WebAssembly export with an incompatible type signature"
);

class WasmFinalizeExportsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("WasmFinalizeExportsPlugin", compilation => {
			compilation.hooks.finishModules.tap(
				"WasmFinalizeExportsPlugin",
				modules => {
					for (const module of modules) {
						const jsIncompatibleExports =
							module.buildMeta.jsIncompatibleExports;

						if (
							typeof jsIncompatibleExports === "undefined" ||
							jsIncompatibleExports.length === 0
						) {
							continue;
						}

						// 1. if a WebAssembly module
						if (module.type.startsWith("webassembly") === true) {
							for (const reason of module.reasons) {
								// 2. is referenced by a non-WebAssembly module
								if (reason.module.type.startsWith("webassembly") === false) {
									// const ref = reason.dependency.getReference();

									// ref.importedNames // returns true?

									const names = [];

									names.forEach(name => {
										// 3. and uses a func with an incompatible JS signature
										if (jsIncompatibleExports.indexOf(name) !== -1) {
											// 4. error
											compilation.errors.push(error);
										}
									});
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
