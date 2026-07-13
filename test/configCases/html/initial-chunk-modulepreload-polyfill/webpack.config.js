"use strict";

// ESM HTML entry targeting an environment without native `<link rel=modulepreload>`
// (`output.environment.modulePreload: false`, the same capability mechanism as the
// JS-feature checks): an ES5 polyfill is inlined once in the <head>.

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
		html: {
			resourceHints: true
		}
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
