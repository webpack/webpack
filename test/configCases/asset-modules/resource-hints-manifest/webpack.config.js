"use strict";

// `output.resourceHintsManifest` writes the resolved per-entry hints to a JSON
// asset (the SSR-manifest analogue of Vite's `build.ssrManifest`). JS-only
// entry, so an SSR server reads this file instead of walking the chunk graph.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		home: "./index.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		assetModuleFilename: "[name][ext]",
		publicPath: "https://cdn.example.com/",
		resourceHints: { initial: true, manifest: "ssr-hints.json" }
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
	module: {
		parser: {
			javascript: {
				urlHints: [{ test: /\.woff2$/, preload: true, as: "font" }]
			}
		},
		rules: [{ test: /\.woff2$/, type: "asset/resource" }]
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
							// Pre-emit the manifest path so the plugin (a later stage)
							// takes the `updateAsset` branch instead of `emitAsset`.
							compilation.emitAsset(
								"ssr-hints.json",
								new webpack.sources.RawSource("placeholder")
							);
						}
					);
				});
			}
		}
	]
};
