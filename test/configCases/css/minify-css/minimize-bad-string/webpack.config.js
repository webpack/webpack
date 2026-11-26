"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../../");

/** @import { Configuration } from "../../../../../" */

const { cssMinify } = webpack.css;

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: "./index.js",
	output: {
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
						minify: [cssMinify],
						minimizerOptions: [{}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
