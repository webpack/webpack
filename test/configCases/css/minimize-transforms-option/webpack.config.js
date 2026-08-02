"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [
							{ compress: { passes: 2 } },
							{ transforms: { customPropertyValues: true } }
						]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
