"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../../");
const jsMinify = require("../../../../../lib/javascript/jsMinify");

/** @import { Configuration } from "../../../../../" */

const { htmlMinify } = webpack.html;

/** @type {Configuration} */
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
				extract: true
			}
		}
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						parallel: false,
						minify: [jsMinify, htmlMinify],
						minimizerOptions: [{}, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
