"use strict";

// Three scripts share a basename and an entry already emits `app1.js`: the
// first keeps `app.js` and the others are numbered past every taken name.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: "./index.html", app1: "./other.js" },
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
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
