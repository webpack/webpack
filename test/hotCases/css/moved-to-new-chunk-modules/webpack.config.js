"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	experiments: {
		css: true
	},
	optimization: {
		// Numeric ids: the runtime can't name a stylesheet it was not built with.
		chunkIds: "deterministic",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				styles: {
					test: /style\.module\.css$/,
					name: "shared",
					chunks: "all",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
