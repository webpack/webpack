"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", other: "./other.js" },
	experiments: {
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		cssFilename: "[name].[contenthash].css"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				styles: {
					test: /style\.css$/,
					name: "shared",
					chunks: "all",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
