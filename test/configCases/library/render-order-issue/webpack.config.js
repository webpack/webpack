"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		minimize: false,
		moduleIds: "named",
		concatenateModules: true,
		usedExports: true
	},
	entry: {
		main: "./index.js",
		entry: "./entry.js"
	},
	output: {
		clean: true,
		filename: "[name].mjs",
		library: {
			type: "module"
		}
	},
	externalsType: "module",
	externals: ["externals0", "externals1"],
	experiments: {
		outputModule: true
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: "./loader",
				sideEffects: true
			}
		]
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
							const source = assets["entry.mjs"].source();
							expect(source).toMatchSnapshot();
						}
					);
				}
			);
		}
	]
};
