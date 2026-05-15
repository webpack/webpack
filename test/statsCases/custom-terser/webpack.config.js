"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");

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
				terserOptions: {
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
