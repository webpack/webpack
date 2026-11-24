"use strict";

const webpack = require("../../../");

const PLUGIN_NAME = "RepeatedWarningsPlugin";

// Emits each warning three times. A global or sticky regexp in
// `ignoreWarnings` must filter every copy, not every other one, and a
// global regexp in `stats.excludeModules` must exclude every module.
/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	ignoreWarnings: [
		{ message: /alpha warning/g },
		{ file: /beta\.js/g },
		{ module: /module\.js/g },
		/sticky warning/y
	],
	stats: {
		modules: true,
		excludeModules: [/module\.js/g]
	},
	plugins: [
		{
			/**
			 * @param {import("../../../").Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
						const target = [...compilation.modules].find((module) =>
							module.identifier().includes("module.js")
						);
						for (let i = 0; i < 3; i++) {
							compilation.warnings.push(
								new webpack.WebpackError("alpha warning")
							);
							const beta = new webpack.WebpackError("beta warning");
							beta.file = "beta.js";
							compilation.warnings.push(beta);
							const gamma = new webpack.WebpackError("gamma warning");
							gamma.module = target;
							compilation.warnings.push(gamma);
							compilation.warnings.push(
								new webpack.WebpackError("sticky warning")
							);
							compilation.warnings.push(
								new webpack.WebpackError("kept warning")
							);
						}
					});
				});
			}
		}
	]
};
