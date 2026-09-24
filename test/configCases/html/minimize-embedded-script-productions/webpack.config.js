"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const htmlMinify = require("../../../../lib/html/htmlMinify");

/** @type {import("../../../../").Configuration} */
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
					// The plugin's own `terserMinify`, as webpack 5.111.1's default minimizer
					// used it: each `<script>` and handler reaches it with an `as` naming
					// its production, which a plugin before 5.10.0 handed to terser as is.
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css|html)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify, htmlMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { css: true, html: true }
};
