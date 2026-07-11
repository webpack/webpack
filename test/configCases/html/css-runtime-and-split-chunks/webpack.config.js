"use strict";

// Combines `optimization.runtimeChunk` (separate runtime chunk),
// `optimization.splitChunks` (vendor JS split off), and JS-imported
// CSS in a single HTML entry. The extracted HTML must load chunks in
// this order so the browser doesn't blow up:
//   1. runtime chunk's `<script>` — must come BEFORE any other JS
//      chunk, otherwise the dependent chunks reference an undefined
//      `__webpack_require__`.
//   2. vendor's `<script>` — before the entry chunk that requires it.
//   3. `<link>` tags for CSS chunks — at any point before the
//      entry's body executes, but the test pins them before all
//      scripts so the cascade is stable.
//   4. entry chunk's `<script>` — last, rewritten in place.

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
		chunkFilename: "[name].chunk.js",
		cssChunkFilename: "[name].chunk.css"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: {
			name: (entrypoint) =>
				entrypoint.name.startsWith("__html_") ? "html-runtime" : undefined
		},
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
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
