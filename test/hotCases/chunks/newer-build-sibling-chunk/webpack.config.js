"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { filename: "[name].js", chunkFilename: "[name].js" },
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				dep: {
					test: /[\\/]dep\.js$/,
					name: "shared",
					chunks: "all",
					enforce: true
				},
				extra: {
					test: /[\\/]extra\.js$/,
					name: "extra",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
