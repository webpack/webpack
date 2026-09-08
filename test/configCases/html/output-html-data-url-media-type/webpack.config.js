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
	entry: {
		// `text/htmlx` is JavaScript, not a page: the html rule matches the
		// media type exactly, so this entry keeps a JavaScript chunk.
		"data-url": { import: "data:text/htmlx,module.exports = 42;", html: false },
		page: "./src/page.js"
	},
	output: { filename: "[name].[contenthash].js", html: true },
	experiments: { html: true },
	plugins: [copyTest]
};
