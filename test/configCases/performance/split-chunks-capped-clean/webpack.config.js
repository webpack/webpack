"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { main: "./index.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		splitChunksCapped: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			maxInitialRequests: 10,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				vendor: { test: /node_modules/, name: "vendor" }
			}
		}
	}
};
