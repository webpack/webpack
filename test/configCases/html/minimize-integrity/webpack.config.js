"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");
const htmlMinify = require("../../../../lib/html/htmlMinify");

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

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: { main: "./src/page.html" },
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: "page.html",
		crossOriginLoading: "anonymous",
		html: { integrity: true },
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// The harness replaces the default minimizer, so wire the HTML one the way
		// `lib/config/defaults.js` does — without it the asset is never minified
		// and the sentinel keeps the quotes it was written with.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.html(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run:
						// the worker pool is another process and reports nothing.
						parallel: false,
						minify: [htmlMinify],
						minimizerOptions: [{}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	},
	plugins: [copyTest]
};
