"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");

const { htmlMinify } = webpack.html.syntax;

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
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						minimizerOptions: [{}, { removeOptionalTags: true }]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
