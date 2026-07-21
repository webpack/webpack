"use strict";

// ESM output (`output.module`) defaults `resourceHints` on (Vite-style): the
// entry's initial dependency chunks get `<link rel="modulepreload">` in the
// HTML `<head>` WITHOUT any `output.resourceHints` set. Classic output stays
// opt-in (see ../initial-chunk-preload-disabled).

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { page: "./page.html" },
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		module: true
		// no `resourceHints` — defaulted on because output.module is true
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
	experiments: { html: true, outputModule: true },
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
