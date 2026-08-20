"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", second: "./a.js" },
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
				// One cache group refused out of three chunks, so only the chunk
				// tie-break puts them in a stable order.
				v: { test: /node_modules/, name: "v" }
			}
		}
	}
};
