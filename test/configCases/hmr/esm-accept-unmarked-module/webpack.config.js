"use strict";

const webpack = require("../../../../");

// A module a plugin returns from `resolve` never passes the factory's `module`
// hook, so HMR leaves it unmarked; its accept call must still be handled.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		{
			apply(compiler) {
				compiler.hooks.normalModuleFactory.tap("UnmarkModules", (factory) => {
					factory.hooks.module.tap(
						{ name: "UnmarkModules", stage: 100 },
						(module) => {
							/** @type {import("../../../../").NormalModule} */ (module).hot =
								false;
							return module;
						}
					);
				});
			}
		}
	]
};
