"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const jsMinify = require("../../../../lib/javascript/jsMinify");

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
		// The default minimizer is replaced by the test harness, so wire jsMinify and
		// htmlMinify into one plugin as lib/config/defaults.js does.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						minify: [jsMinify, htmlMinify],
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
