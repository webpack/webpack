"use strict";

// Repro of jantimon/html-webpack-plugin#1838 (which references
// webpack/mini-css-extract-plugin#959) for webpack's HTML entry
// pipeline. page.html includes `<script src="./entry.js">`; entry.js
// imports two CSS files; splitChunks forces each `.css` into its own
// chunk. The HTML must reference both stylesheets with
// `<link rel="stylesheet">` tags pointing at the actual `.css` files
// (not as `<script src="…\.js">`), and the JS must come after the
// stylesheet links so script execution waits for styles.

const fs = require("node:fs");
const path = require("node:path");
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
		splitChunks: {
			cacheGroups: {
				style1: {
					test: /style1\.css$/,
					name: "style1",
					chunks: "all",
					enforce: true
				},
				style2: {
					test: /style2\.css$/,
					name: "style2",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
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
