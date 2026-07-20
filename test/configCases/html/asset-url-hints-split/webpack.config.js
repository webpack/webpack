"use strict";

// HTML entry with `runtimeChunk: "single"` and a split vendor chunk. URL
// asset hints from BOTH the entry chunk (font.woff2) and the vendor chunk
// (image.png) must emit into the HTML <head> at build time — never as
// runtime `__webpack_require__.PA/LA` calls (since a JS-runtime hint would
// fire after the browser has already started fetching the initial chunks).

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: ["web", "es2022"],
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		module: true,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		// Rule-based hint for images in addition to the magic comment on the
		// font — proves both channels reach the HTML head. Set on the JS parser
		// because the image reference is a JS `new URL(...)`.
		parser: {
			javascript: {
				urlHints: [{ test: /\.png$/, prefetch: true, fetchPriority: "low" }]
			}
		}
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	experiments: {
		html: true,
		outputModule: true
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
