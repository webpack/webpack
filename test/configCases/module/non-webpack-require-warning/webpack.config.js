"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			module: true
		},
		target: ["node"],
		experiments: {
			outputModule: true
		},
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.compilation.tap("Test", (compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: "copy-webpack-plugin",
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								compilation.emitAsset(
									"bar.js",
									new webpack.sources.RawSource("module.exports = 1;")
								);
							}
						);
					});
				}
			}
		]
	},
	{
		output: {
			module: true
		},
		target: "web",
		experiments: {
			outputModule: true
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner:
					'import { createRequire } from "module"; const require = createRequire(import.meta.url)'
			})
		]
	}
];
