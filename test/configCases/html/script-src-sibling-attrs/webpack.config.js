"use strict";

// A `<script src>` HTML entry whose JS imports CSS, carrying the three
// copyable CSP/fetch attributes in all three source forms — quoted
// (`nonce="…"`), bare (`crossorigin`), and unquoted (`referrerpolicy=…`).
// The synthesized sibling `<link>` must carry each one back byte-exact,
// exercising every branch of the parser's `attrSourceSpan`.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true, css: true },
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
