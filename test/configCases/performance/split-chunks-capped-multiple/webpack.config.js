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
			maxInitialRequests: 1,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				// Both would move one module out of the same chunk, so only the
				// cache-group tie-break puts them in a stable order.
				alpha: { test: /vendor-lib/, name: "alpha" },
				zebra: { test: /other-lib/, name: "zebra" }
			}
		}
	}
};
