"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	cache: {
		type: "memory" // Enable memory cache to test serialization
	},
	mode: "none",
	entry: { main: "./index.js", test: "./test.js" },
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		filename: "[name].js",
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: [".js"]
	},
	externalsType: "module",
	externals: [
		"externals0",
		"externals1",
		"externals2",
		"externals3",
		"externals4"
	],
	optimization: {
		concatenateModules: false,
		usedExports: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"testcase",
				(
					/** @type {import("../../../../types").Compilation} */ compilation
				) => {
					compilation.hooks.afterProcessAssets.tap(
						"testcase",
						(
							/** @type {Record<string, import("webpack-sources").Source>} */ assets
						) => {
							const source = assets["test.js"].source();
							expect(source).toMatchSnapshot();
						}
					);
				}
			);
		}
	]
};
