"use strict";

// `output.autoPreconnect` emits a `<link rel="preconnect">` for a cross-origin
// `output.publicPath` (mirroring `output.crossOriginLoading`).

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { page: "./page.html" },
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		publicPath: "https://cdn.example.com/assets/",
		crossOriginLoading: "anonymous",
		resourceHints: { initial: true, preconnect: true }
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
	experiments: { html: true },
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
