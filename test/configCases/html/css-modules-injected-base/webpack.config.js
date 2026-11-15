"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/**
 * An injected `output.html.base` makes a link to the page's own file a link
 * elsewhere, so its fragment keeps its authored name.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	entry: { page: "./page.html" },
	output: {
		filename: "[name].js",
		cssFilename: "[name].css",
		html: { base: "https://example.com/other/" }
	},
	module: {
		generator: {
			"css/auto": { localIdentName: "[id]-[local]" }
		}
	},
	experiments: {
		html: true,
		css: true
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
