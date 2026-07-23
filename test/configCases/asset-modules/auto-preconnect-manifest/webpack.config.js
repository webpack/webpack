"use strict";

// `output.autoPreconnect` also feeds the SSR manifest / stats: a JS-only entry
// gets a `preconnect` descriptor for the cross-origin publicPath. No
// `crossOriginLoading` here, so the descriptor carries no crossorigin.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { home: "./index.js" },
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		publicPath: "https://cdn.example.com/",
		resourceHints: { initial: true, preconnect: true, manifest: "hints.json" }
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
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
