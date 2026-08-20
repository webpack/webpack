"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", second: "./p0.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		splitChunksCapped: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			maxInitialRequests: 1,
			maxAsyncRequests: 1,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				// Unnamed, so each chunk combination is its own candidate and the
				// queue refuses the same cache group out of one chunk repeatedly.
				g1: { test: /node_modules/, priority: 5 },
				g2: { test: /node_modules[\\/]l[12]/, priority: 10 }
			}
		}
	}
};
