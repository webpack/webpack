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
		// Same wiring as the production default (lib/config/defaults.js): one
		// minimizer plugin holding both minify functions, each routed by its filter.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {any} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
