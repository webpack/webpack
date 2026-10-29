"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: { page: "./page.html" },
	module: {
		rules: [
			{
				test: /page\.html$/,
				loader: path.resolve(__dirname, "deep-loader.js")
			}
		]
	},
	optimization: {
		// The page is checked for the bodies the failed modules left as written.
		emitOnErrors: true
	},
	experiments: {
		html: true,
		css: true
	},
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
		}
	]
};
