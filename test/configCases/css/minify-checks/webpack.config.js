"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// one entry per case, so each is minified as its own asset
	entry: {
		"minify-at-rules-and-values": "./minify-at-rules-and-values/index.js",
		"minify-calc-number-outside": "./minify-calc-number-outside/index.js",
		"minify-color-names": "./minify-color-names/index.js",
		"minify-initial-keyword-engine-gap":
			"./minify-initial-keyword-engine-gap/index.js",
		"minify-modern-longhands": "./minify-modern-longhands/index.js",
		"minify-selectors-and-functions":
			"./minify-selectors-and-functions/index.js",
		"minify-value-keywords": "./minify-value-keywords/index.js"
	},
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						extractComments: false,
						test: /\.css(\?.*)?$/i,
						minify: cssMinify
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
