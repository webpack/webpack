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
	entry: { main: "./src/main.js" },
	// No `crossOriginLoading`: SRI is still emitted but the browser ignores it
	// on cross-origin loads, so the build must warn (see warnings.js).
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: "index.html",
		html: { integrity: true }
	},
	experiments: { html: true },
	plugins: [copyTest]
};
