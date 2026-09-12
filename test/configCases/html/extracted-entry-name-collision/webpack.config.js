"use strict";

// Two linked pages whose scripts share a basename, linked against their lexical
// order: the one linked first keeps `app.js`, the other is numbered past it.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: "./index.html" },
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
				// No page emits JavaScript of its own, so the assertions ride in on
				// an asset of their own.
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
