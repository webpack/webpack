"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const svgMinify = require("../../../helpers/svgMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	devtool: "source-map",
	output: { pathinfo: false },
	module: {
		// `url` off, so the `data:` payload stays in the stylesheet where only
		// the serializer reaches it — and where rewriting it moves everything
		// after it along the line.
		parser: { "css/auto": { url: false } }
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
