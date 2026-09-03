"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const svgMinify = require("../../../helpers/svgMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	output: { pathinfo: false },
	module: {
		rules: [{ test: /\.(?:svg|css)$/, type: "asset/inline" }]
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css|svg)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify, svgMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { css: true }
};
