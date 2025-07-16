"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		optimization: {
			minimize: false
		},
		module: {
			rules: [
				{
					test: /index.js$/,
					type: "javascript/dynamic"
				},
				{
					test: /esm/,
					type: "javascript/esm"
				}
			]
		},
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.compilation.tap("Test", compilation => {
						compilation.hooks.processAssets.tap(
							{
								name: "copy-webpack-plugin",
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								const data = fs.readFileSync(
									path.resolve(__dirname, "./test.js")
								);

								compilation.emitAsset(
									"test.js",
									new webpack.sources.RawSource(data)
								);
							}
						);
					});
				}
			}
		]
	}
];
