"use strict";

// `<script src>` in HTML where the bundled JS imports CSS. With
// `experiments.css`, webpack puts the JS and the CSS into the same
// entry chunk (no splitChunks). Before this was wired up the `.css`
// file was emitted to disk but the extracted HTML only contained the
// `<script>` tag, so browsers never loaded the stylesheet — the
// `CssLoadingRuntimeModule` records initial CSS chunks as already
// loaded and expects the HTML to inject the corresponding `<link>`.

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
	optimization: { chunkIds: "named" },
	experiments: { html: true, css: true },
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
