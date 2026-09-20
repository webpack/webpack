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
	target: ["web", "es2022"],
	entry: {
		page: "./page.html",
		bad: "./bad.html"
	},
	output: { module: true, htmlFilename: "[name].html" },
	module: {
		// A tag's own comment wins over this, so the pages below show both.
		parser: { html: { chunkName: "option-[index]" } }
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true },
	plugins: [copyTest]
};
