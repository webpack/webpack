"use strict";

// Same as `initial-chunk-preload` but with `output.module`: the entry's initial
// dependency chunks are hinted with `<link rel="modulepreload">` instead of
// `<link rel="preload" as="script">`.

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
		resourceHints: true
	},
	optimization: {
		chunkIds: "named",
		// A separate runtime chunk gives the entry a real initial sibling chunk,
		// so the `modulepreload` of initial chunks covers more than the entry.
		runtimeChunk: "single"
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
