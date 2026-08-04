"use strict";

// `fetchpriority` on the auto initial-graph hints, set through the `resourceHints`
// function form (map each default hint to a fresh descriptor — returning the default
// object itself reuses its prebuilt tag). Worth covering because these hints land in
// the extracted HTML: the preload scanner sees them, so the attribute is honored,
// whereas browsers ignore it on a runtime-injected `modulepreload` link.

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
		module: true,
		resourceHints: ({ defaultHints }) =>
			defaultHints.map((h) => ({
				rel: h.rel,
				chunk: h.chunk,
				fetchPriority: "high"
			}))
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
