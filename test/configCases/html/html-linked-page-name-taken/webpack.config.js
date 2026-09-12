"use strict";

// An entry already called `about` emits `about.js`, so the linked page's
// `<script src="./about.js">` cannot have that name and is numbered past it.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: "./index.html", about: "./about-page.js" },
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	module: {
		parser: {
			html: {
				sources: ["...", { tag: "a", attribute: "href", type: "html" }]
			}
		}
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true },
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
