"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
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
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: { page: "./src/main.js" },
	output: {
		filename: "[name].js",
		htmlFilename: "page.html",
		html: { inline: true }
	},
	// The runtime is inlined next to the entry, which is the shape a run folds.
	optimization: {
		runtimeChunk: "single",
		minimize: { html: { mergeScripts: true } },
		minimizer: ["..."]
	},
	experiments: { html: true },
	plugins: [copyTest]
};
