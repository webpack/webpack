"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		mangleExports: false,
		usedExports: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"test",
				(
					/** @type {import("../../../../types").Compilation} */ compilation
				) => {
					compilation.hooks.afterProcessAssets.tap(
						"test",
						(
							/** @type {Record<string, import("webpack-sources").Source>} */ assets
						) => {
							const source = assets["bundle0.js"].source();
							expect(source).toMatchSnapshot();
						}
					);
				}
			);
		}
	]
};
