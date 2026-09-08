"use strict";

// An `.html` entry whose JS side is asked for through `output.library`: the
// page is still emitted, and the entry's JS asset is kept as the library.

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
		chunkFilename: "[name].chunk.js",
		library: {
			type: "commonjs2"
		},
		// A hint naming this entry covers both halves of the page: its own
		// library JavaScript and the script the parser extracted from it.
		resourceHints: [{ rel: "preload", as: "script", entry: "page" }]
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
				// Provide a free-standing test runner; the html entry's JS asset
				// exports the page markup and carries no `it()` calls of its own.
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
