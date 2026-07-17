"use strict";

// Regression test: a `<link rel="stylesheet">` HTML entry together with
// `optimization.runtimeChunk` puts a JS-only runtime chunk in the stylesheet
// entrypoint. The stylesheet sibling loop must skip chunks without a `.css`
// asset — otherwise it emits `<link rel="stylesheet" href="runtime.css">`
// pointing at a file that is never emitted (a 404).

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single"
	},
	experiments: {
		html: true,
		css: true
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
							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(
									fs.readFileSync(path.resolve(__dirname, "test.js"))
								)
							);
						}
					);
				});
			}
		}
	]
};
