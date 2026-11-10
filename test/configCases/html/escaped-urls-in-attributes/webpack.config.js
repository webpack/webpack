"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"test.js",
						new webpack.sources.RawSource(
							fs.readFileSync(path.resolve(__dirname, "test.js"))
						)
					);
				}
			);
		});
	}
};

// Chunk names and asset queries are data: written into an attribute, they keep
// every character, and none ends the attribute or adds one.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	mode: "development",
	devtool: false,
	entry: {
		page: "./page.html",
		app: "./app.js"
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		htmlFilename: "[name].html",
		assetModuleFilename: "[name][ext][query]"
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
	plugins: [copyTest]
};
