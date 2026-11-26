"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const jsMinify = require("../../../../lib/javascript/jsMinify");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false, assetModuleFilename: "[name][ext]" },
	module: {
		rules: [{ test: /\.html$/, type: "asset/resource" }]
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					// Each `<script>` and handler reaches the JavaScript minifier with an
					// `as` naming its production.
					new MinimizerPlugin({
						extractComments: false,
						test: /\.(?:[cm]?js|css|html)(\?.*)?$/i,
						minify: [jsMinify, cssMinify, htmlMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { css: true, html: true }
};
