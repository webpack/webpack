"use strict";

// HTML used as a compilation entry with `target: "universal"`: the page, its
// `asset/webmanifest`, its assets and the extracted CSS must be emitted the
// same way they are for a browser target — the document is served to a browser
// no matter which runtime the JS bundle runs in.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "universal",
	mode: "development",
	devtool: false,
	entry: {
		page: "./page.html"
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		outputModule: true,
		css: true,
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				// The HTML entry's JS chunk only exports the page string, so the
				// assertions ship as their own asset (like `html-entry-point`).
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
