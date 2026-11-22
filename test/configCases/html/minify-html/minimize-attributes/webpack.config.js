"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../../lib/html/htmlMinify");
const jsMinify = require("../../../../../lib/javascript/jsMinify");

/** @type {import("../../../../../").Configuration} */
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
		// The default minimizer is replaced by the harness, so wire the HTML minify
		// function in the same way `lib/config/defaults.js` does: an array of minify
		// functions, each routed by its own `filter`, in one instance.
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
