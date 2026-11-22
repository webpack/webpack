"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const jsMinify = require("../../../lib/javascript/jsMinify");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({
				minify: jsMinify,
				minimizerOptions: {
					mangle: false,
					output: {
						beautify: true,
						comments: false
					}
				}
			})
		]
	},
	stats: {
		chunkModules: false,
		modules: true,
		providedExports: true,
		usedExports: true
	}
};
