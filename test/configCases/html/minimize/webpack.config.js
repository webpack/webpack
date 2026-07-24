"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../lib/html/htmlMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				// Emit the processed HTML as a real `.html` file the minimizer runs on.
				extract: true
			}
		}
	},
	optimization: {
		minimize: true,
		// The default minimizer is replaced by the test harness, so wire the HTML
		// minify function into one minimizer plugin the same way the production
		// default does (lib/config/defaults.js): an array of minify functions, each
		// routed by its own `filter`, in a single instance / worker pool.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
