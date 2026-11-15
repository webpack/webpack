"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
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
					enforce: true,
					minSize: 0
				}
			}
		}
	}
};
