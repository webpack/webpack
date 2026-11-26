"use strict";

/** @import { Configuration, NormalModule } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false
	},
	plugins: [
		// A module a plugin returns from `resolve` never passes the factory's
		// `module` hook, so HMR leaves it unmarked; its accept still updates imports.
		{
			apply(compiler) {
				compiler.hooks.normalModuleFactory.tap("UnmarkModules", (factory) => {
					factory.hooks.module.tap(
						{ name: "UnmarkModules", stage: 100 },
						(module) => {
							/** @type {NormalModule} */ (module).hot = false;
							return module;
						}
					);
				});
			}
		}
	]
};
