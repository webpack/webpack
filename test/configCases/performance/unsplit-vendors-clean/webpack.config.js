"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { main: "./index.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		unsplitVendors: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				vendor: { test: /node_modules/, name: "vendor", enforce: true }
			}
		}
	}
};
