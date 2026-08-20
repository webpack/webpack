"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: false,
		splitChunksCapped: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			maxInitialRequests: 1,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				vendor: { test: /node_modules/, name: "vendor" }
			}
		}
	}
};
