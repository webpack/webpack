"use strict";

const path = require("path");

const PLUGIN_NAME = "SideEffectsFlagPluginCacheTest";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		minimize: false,
		sideEffects: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					const module = [...compilation.modules].find(
						(module) =>
							module.nameForCondition() === path.join(__dirname, "index.js")
					);
					expect(module).toBeDefined();
					const bailouts = compilation.moduleGraph
						.getOptimizationBailout(
							/** @type {import("../../../../").Module} */ (module)
						)
						.map((bailout) =>
							typeof bailout === "function"
								? bailout(compilation.requestShortener)
								: bailout
						);

					expect(bailouts).toContain(
						"Statement (ExpressionStatement) with side effects in source code at 1:0-29"
					);
				});
			});
		}
	]
};
