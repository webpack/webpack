"use strict";

// A CSS entry under `output.html`: the page and its stylesheet are the whole
// output — the page carries no JavaScript for a stylesheet to be linked from.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `target: "web"` makes the CSS generator emit a `.css` file (under the
	// harness default `async-node`, `exportsOnly` keeps it out of the output).
	target: "web",
	entry: {
		page: "./style.css"
	},
	output: {
		filename: "[name].js",
		cssFilename: "[name].css",
		chunkFilename: "[name].chunk.js",
		html: true
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [
		{
			apply(compiler) {
				// The entry emits no JavaScript, so the assertions ride in on an
				// asset of their own.
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
