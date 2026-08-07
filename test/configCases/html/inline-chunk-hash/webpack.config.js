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
	mode: "development",
	entry: { main: "./src.js" },
	output: {
		filename: "[name].js",
		htmlFilename: "main.html",
		// Inlining resolves each chunk through a sentinel carrying its hash; in
		// development the chunk carries no content hash, so the fallback runs.
		html: { inline: true }
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest]
};
