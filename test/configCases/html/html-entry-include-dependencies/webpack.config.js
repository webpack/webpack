"use strict";

// An entry whose page is not all it carries: a plugin adds an included
// dependency to it, so the entry keeps its own JavaScript and its filename.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: "./page.html"
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
				compiler.hooks.finishMake.tapAsync("Test", (compilation, callback) => {
					compilation.addInclude(
						compiler.context,
						webpack.EntryPlugin.createDependency("./extra.js", {}),
						{ name: "main" },
						(err) => callback(err)
					);
				});
				// The entry's own bundle is the page's markup, so the assertions
				// ride in on an asset of their own.
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
