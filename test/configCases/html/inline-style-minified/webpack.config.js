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

/** @type {(suffix: string, minimizer: NonNullable<import("../../../../").Configuration["optimization"]>["minimizer"]) => import("../../../../").Configuration} */
const config = (suffix, minimizer) => ({
	target: ["web", "es2020"],
	mode: "production",
	// An `<iframe srcdoc>` sends a page through the asynchronous print.
	entry: { page: "./page.html", srcdoc: "./srcdoc.html" },
	output: {
		htmlFilename: `[name]${suffix}.html`,
		cssFilename: `[name]${suffix}.css`,
		html: { inline: true }
	},
	optimization: {
		chunkIds: "named",
		minimize: true,
		minimizer
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The default minimizers, which hand the HTML minifier a renderer.
	config("", ["..."]),
	// The HTML minifier alone and in-process, so the coverage instrument sees
	// the minify run: the worker pool is another process and reports nothing.
	config("-in-process", [
		{
			apply: (compiler) => {
				new MinimizerPlugin({
					test: /\.html(\?.*)?$/i,
					parallel: false,
					minify: [htmlMinify],
					minimizerOptions: [{}]
				}).apply(/** @type {EXPECTED_ANY} */ (compiler));
			}
		}
	])
];
