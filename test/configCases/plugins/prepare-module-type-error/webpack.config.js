"use strict";

const PLUGIN_NAME = "PrepareModuleTypeErrorTestPlugin";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.custom$/, type: "asset/source" }]
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					PLUGIN_NAME,
					(compilation, { normalModuleFactory }) => {
						normalModuleFactory.hooks.prepareModuleType
							.for("asset/source")
							.tapPromise(PLUGIN_NAME, () =>
								Promise.reject(new Error("prepare failed"))
							);
					}
				);
			}
		}
	]
};
