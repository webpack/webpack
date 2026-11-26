"use strict";

/** @import { Configuration, Compilation } from "../../../../types.d.ts" */
/** @import { Source } from "webpack-sources" */

/** @type {Configuration} */
module.exports = {
	cache: {
		type: "memory" // Enable memory cache to test serialization
	},
	mode: "production",
	entry: { main: "./index.js", test: "./test.js" },
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		filename: "[name].js",
		chunkFormat: "module"
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
		usedExports: true,
		minimize: false,
		moduleIds: "named"
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"testcase",
				(/** @type {Compilation} */ compilation) => {
					compilation.hooks.afterProcessAssets.tap(
						"testcase",
						(/** @type {Record<string, Source>} */ assets) => {
							const source = assets["test.js"].source();
							expect(source).toMatchSnapshot();
						}
					);
				}
			);
		}
	]
};
