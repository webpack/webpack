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
						test: /\.css(\?.*)?$/i,
						minify: cssMinify
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
