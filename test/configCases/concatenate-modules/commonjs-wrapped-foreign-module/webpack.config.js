"use strict";

const PLUGIN_NAME = "ForeignModuleTestPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	experiments: { css: true },
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
						for (const module of modules) {
							if (!module.type.startsWith("css/")) continue;
							// A module built against an older webpack extends a base class
							// predating this, so looking it up on the instance finds nothing.
							/** @type {Partial<import("../../../../").Module>} */
							(module).canBeWrappedInConcatenation = undefined;
						}
					});
				});
			}
		}
	]
};
