"use strict";

const webpack = require("../../../");

const PLUGIN_NAME = "AddWarningsPlugin";

// Emits warnings without an `ignoreWarnings`/`warningsFilter`, so `warningsCount`
// is computed from the raw warnings; details are hidden to assert the count alone.
/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	stats: {
		all: false,
		warnings: false,
		warningsCount: true
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
						for (let i = 0; i < 3; i++) {
							compilation.warnings.push(
								new webpack.WebpackError(`Warning ${i}`)
							);
						}
					});
				});
			}
		}
	]
};
