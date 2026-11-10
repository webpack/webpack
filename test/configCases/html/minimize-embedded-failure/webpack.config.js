"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const xmlMinify = require("../../../../lib/html/xmlMinify");

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
 * A CSS minifier that fails on everything it is handed.
 * @returns {never} never returns
 */
const failingCssMinify = () => {
	throw new Error("failing CSS minifier");
};
failingCssMinify.getTypes = () => ["css"];
failingCssMinify.filter = (/** @type {string} */ name) => name.endsWith(".css");

/**
 * @param {((...args: EXPECTED_ANY[]) => EXPECTED_ANY)[]} minify the minify functions
 * @param {EXPECTED_OBJECT[]} minimizerOptions their options
 * @returns {import("../../../../").WebpackPluginInstance} the minimizer
 */
const inProcess = (minify, minimizerOptions) => ({
	apply: (compiler) => {
		// In-process, so the coverage instrument sees the minify run: the worker
		// pool is another process and reports nothing.
		new MinimizerPlugin({
			test: /\.(?:html|svg)$/,
			parallel: false,
			minify,
			minimizerOptions
		}).apply(/** @type {EXPECTED_ANY} */ (compiler));
	}
});

/** @type {(suffix: string, minimizer: import("../../../../").WebpackPluginInstance) => import("../../../../").Configuration} */
const config = (suffix, minimizer) => ({
	target: "web",
	mode: "production",
	entry: { page: "./page.html" },
	output: {
		pathinfo: false,
		htmlFilename: `[name]${suffix}.html`,
		assetModuleFilename: `[name]${suffix}[ext]`
	},
	optimization: {
		minimize: true,
		minimizer: [minimizer],
		// The pages are checked for what the failed minifiers left as written.
		emitOnErrors: true
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The caller's CSS minifier fails, so webpack's own does not get a try.
	config("-caller", inProcess([htmlMinify, failingCssMinify], [{}, {}])),
	// Webpack's own CSS minifier fails: `unusedSymbols` that is no list stands in
	// for anything that makes it throw.
	config(
		"-builtin",
		inProcess(
			[htmlMinify, xmlMinify],
			[{ css: { unusedSymbols: 42 } }, { css: { unusedSymbols: 42 } }]
		)
	)
];
