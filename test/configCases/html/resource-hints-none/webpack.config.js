"use strict";

// `output.resourceHints: "none"` is a hard off switch: neither the auto
// initial-graph preload (runtime sibling) nor the URL-asset preload
// (`new URL(webpackPreload)`) may emit a `<link>` anywhere.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		assetModuleFilename: "[name][ext]",
		resourceHints: "none"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single"
	},
	module: {
		rules: [{ test: /\.png$/, type: "asset/resource" }]
	},
	experiments: {
		html: true
	},
	plugins: [
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
