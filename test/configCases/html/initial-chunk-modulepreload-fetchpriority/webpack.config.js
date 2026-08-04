"use strict";

// `output.resourceHints.fetchPriority` — applied to the auto initial-graph hints,
// which webpack writes into the extracted HTML. Those are parser-inserted, so the
// browser's preload scanner honors the attribute (it is ignored on runtime-injected
// `modulepreload` links).

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
		resourceHints: { fetchPriority: "high" }
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
