"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	experiments: {
		css: true
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				base: {
					test: /base\.css$/,
					name: "base",
					chunks: "async",
					enforce: true
				}
			}
		}
	}
};
