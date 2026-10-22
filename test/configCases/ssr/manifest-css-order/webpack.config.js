"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	experiments: {
		css: true
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js",
		cssFilename: "[name].css",
		cssChunkFilename: "[name].css",
		publicPath: ""
	},
	optimization: {
		chunkIds: "named",
		minimize: false,
		splitChunks: {
			cacheGroups: {
				// the split that gives the route a second stylesheet
				alpha: {
					test: /alpha\.css$/,
					chunks: "all",
					enforce: true,
					name: "alpha"
				}
			}
		}
	},
	plugins: [
		new SSRManifestPlugin(),
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(path.resolve(__dirname, "test.js"));
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
};
