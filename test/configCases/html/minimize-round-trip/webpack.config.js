"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../lib/html/htmlMinify");

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
		},
		parser: {
			html: {
				// The corpus is about serialization, so references stay literal.
				sources: false
			}
		}
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.html(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run:
						// the worker pool is another process and reports nothing.
						parallel: false,
						minify: [htmlMinify],
						minimizerOptions: [{}]
					}).apply(/** @type {any} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
