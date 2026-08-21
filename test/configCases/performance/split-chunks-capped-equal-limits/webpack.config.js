"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
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
			// Equal, as they are by default in production: only the chunk decides
			// which of the two refused the split.
			maxInitialRequests: 1,
			maxAsyncRequests: 1,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				vendor: { test: /node_modules/, name: "vendor" }
			}
		}
	}
};
