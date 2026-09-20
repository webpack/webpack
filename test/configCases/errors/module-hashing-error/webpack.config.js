"use strict";

const PLUGIN_NAME = "BreakModuleHashingPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		// the module still generates code, so the asset is worth looking at
		emitOnErrors: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
						for (const module of modules) {
							module.updateHash = () => {
								throw new Error("updateHash of the module failed");
							};
						}
					});
				});
			}
		}
	]
};
