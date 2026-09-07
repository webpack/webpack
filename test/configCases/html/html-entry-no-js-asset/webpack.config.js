"use strict";

// An `.html` file used as a compilation entry. The entry chunk's JS side only
// re-exports the markup that was written out as `page.html`, and the page loads
// the `<script src>` entries the parser split out of it — never that chunk — so
// no JS asset should be emitted for the entry.

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
				// Provide a free-standing test runner; the html entry has no JS
				// asset of its own to carry the `it()` calls.
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
