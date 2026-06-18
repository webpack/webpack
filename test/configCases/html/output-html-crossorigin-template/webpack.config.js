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

// Real `.html` template entry: `output.crossOriginLoading` is added to tags
// that have no `crossorigin`, but an author-set value is preserved.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { page: "./src/page.html" },
	output: { filename: "[name].js", crossOriginLoading: "anonymous" },
	optimization: { minimize: false },
	experiments: { html: true },
	plugins: [copyTest]
};
