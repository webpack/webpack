"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
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

/**
 * @param {"development" | "production"} mode build mode
 * @param {string} testPath the case's output directory
 * @returns {import("../../../../").Configuration} the build
 */
const config = (mode, testPath) => ({
	name: mode,
	target: ["web", "es2022"],
	mode,
	devtool: false,
	entry: {
		page: "./page.html"
	},
	output: {
		path: path.join(testPath, mode),
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		cssFilename: "[name].css",
		htmlFilename: "[name].html",
		crossOriginLoading: "anonymous",
		html: { integrity: true }
	},
	optimization: {
		chunkIds: "named",
		minimize: mode === "production",
		// The harness replaces the default minimizer, so the page's is wired here.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.html$/i,
						parallel: false,
						minify: webpack.html.htmlMinify
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { html: true, css: true },
	plugins: [copyTest]
});

// Text from a stylesheet's comment lands in a resource hint's attributes; one
// spelled like the page's own integrity or inline markers stays text, also
// once the page is minified.
/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	config("development", testPath),
	config("production", testPath)
];
