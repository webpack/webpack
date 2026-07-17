"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: "./index.js",
	devtool: false,
	experiments: {
		css: true
	},
	optimization: {
		minimize: false,
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				vendor: {
					test: /node_modules/,
					name: "vendor",
					enforce: true
				}
			}
		}
	},
	output: {
		cssFilename: "[name].css"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
