"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	entry: {
		page: "./page.html"
	},
	experiments: {
		outputModule: true,
		css: true,
		html: true
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	output: {
		module: true,
		publicPath: "auto",
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		cssChunkFilename: "[name].css"
	},
	// No warnings.js accompanies this case, so any bailout the build records for
	// the chunks an html entry brings with it fails it.
	performance: {
		hints: "warning",
		analyzableBailouts: true
	},
	plugins: [
		{
			apply(compiler) {
				// The html entry's javascript only exports the page string, so the
				// assertions ship as their own asset, as `universal-html-entry` does.
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
