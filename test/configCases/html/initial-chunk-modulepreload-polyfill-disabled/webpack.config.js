"use strict";

// Same setup as ../initial-chunk-modulepreload-polyfill (ESM output, environment
// without native `<link rel=modulepreload>`), but `output.modulePreloadPolyfill:
// false` opts out of the inline ES5 polyfill (e.g. strict CSP). The
// `<link rel="modulepreload">` tags are still emitted.

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
		environment: {
			modulePreload: false
		},
		resourceHints: { initial: true, modulePreloadPolyfill: false }
	},
	optimization: {
		chunkIds: "named",
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
