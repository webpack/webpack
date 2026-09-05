"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	performance: {
		hints: "stats",
		duplicateModules: true,
		splitChunksCapped: true,
		unsplitVendors: true,
		conflictingResourceHints: true
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
