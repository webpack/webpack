"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

// Webpack's own minimizer, as a production build runs it: the HTML one offers
// each URL attribute's `data:` payload to the minifier for its media type.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: { page: "./page.html" },
	output: { filename: "[name].js" },
	optimization: {
		// The test harness turns minimizing off and swaps in its own minimizer.
		minimize: true,
		minimizer: ["..."]
	},
	experiments: { html: true },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							// Past minimizing, so the runner is copied as written.
							stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
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
