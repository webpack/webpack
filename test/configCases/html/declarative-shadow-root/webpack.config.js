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
		// The harness replaces the default minimizer, so wire HTML minify up the way
		// `lib/config/defaults.js` does: filter-routed functions on one instance.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run:
						// the worker pool is another process and reports nothing.
						parallel: false,
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {any} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
