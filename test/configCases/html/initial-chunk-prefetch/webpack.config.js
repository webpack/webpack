"use strict";

// `output.resourceHints.chunks: "prefetch"` — auto-emit `<link rel="prefetch">`
// for the entry's initial dependency chunks (Rsbuild `performance.prefetch = true`
// equivalent). Prefetch is an idle-time hint, so `as`/`integrity`/`nonce` are
// not required — the tag stays minimal.

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
		resourceHints: {
			chunks: "prefetch"
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
