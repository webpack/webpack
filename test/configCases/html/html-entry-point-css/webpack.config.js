"use strict";

// HTML entry point that references a CSS stylesheet via
// `<link rel="stylesheet" href="…">`. With `experiments.css` enabled, the
// CSS goes through webpack's CSS pipeline (so `url()` references are
// resolved into asset modules), and the extracted HTML should reference
// the emitted `.css` chunk rather than the original `./style.css`. The
// `url()` asset URL in the emitted CSS should also be a hashed filename.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `target: "web"` makes the default CSS generator emit `.css` files
	// (with `target: "async-node"`, `exportsOnly` defaults to `true` and
	// CSS chunks aren't emitted).
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
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
