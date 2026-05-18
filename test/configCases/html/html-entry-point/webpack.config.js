"use strict";

// HTML used directly as a compilation entry. `module.generator.html.extract`
// is left at its default (undefined), which means HtmlGenerator should
// auto-enable extraction for entry HTML modules so the page is emitted as a
// `.html` output file — the HTML-entry-point use case.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				// Provide a free-standing test runner; the html entry's JS chunk
				// holds the HTML string export but doesn't contain any `it()`
				// calls of its own.
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
