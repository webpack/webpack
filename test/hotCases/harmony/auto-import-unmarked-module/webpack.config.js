"use strict";

/** @import { Configuration, NormalModule } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
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
