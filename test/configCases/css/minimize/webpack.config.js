"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		// Mirror a real production build: no per-module pathinfo banners.
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// The default minimizer is replaced by the test harness, so wire the CSS
		// minify function into one minimizer plugin the same way the production
		// default does (lib/config/defaults.js): an array of minify functions, each
		// routed by its own `filter`, in a single instance / worker pool.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
