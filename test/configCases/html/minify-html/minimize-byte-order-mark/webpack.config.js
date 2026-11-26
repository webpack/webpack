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
		rules: [
			{
				test: /page\.html$/,
				type: "asset/resource",
				generator: { filename: "page.html" }
			}
		]
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
					}).apply(compiler);
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
