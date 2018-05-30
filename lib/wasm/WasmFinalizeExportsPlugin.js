/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	*/
"use strict";

class WasmFinalizeExportsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("WasmFinalizeExportsPlugin", compilation => {
			compilation.hooks.finishModules.tap(
				"WasmFinalizeExportsPlugin",
				modules => {
					for (const module of modules) {
						// 1. if module has reExports
						if (module.buildMeta.reExports) {
							module.buildMeta.reExports.forEach(reExport => {
								console.log("found reexport", reExport);

								// 2. find child dependency
								const child = module.dependencies.find(
									({ request }) => request === reExport.module
								);

								// 3. find parent dependency
								module.reasons.forEach(reason => {
									const usedName = reason.module.isUsed(reExport.reExportedAs);

									// 4. rewire child and parent modules together
									if (usedName) {
										reason.module.addDependency(child.module);
									}
								});

								module.removeDependency(child);
							});
						}
					}
				}
			);
		});
	}
}

module.exports = WasmFinalizeExportsPlugin;
