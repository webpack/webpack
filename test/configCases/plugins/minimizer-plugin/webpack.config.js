"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const jsMinify = require("../../../../lib/javascript/jsMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		ie8: ["./ie8.js"],
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"],
		extract: ["./extract.js"],
		compress: ["./compress.js"]
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({
				minify: jsMinify,
				parallel: false,
				extractComments: false,
				exclude: ["vendors.js", "compress.js", "extract.js"]
			}),
			new MinimizerPlugin({
				minify: jsMinify,
				parallel: false,
				include: ["extract.js"]
			}),
			new MinimizerPlugin({
				minify: jsMinify,
				parallel: false,
				minimizerOptions: {
					compress: {
						passes: 2
					}
				},
				extractComments: false,
				include: ["compress.js"]
			})
		]
	}
};
