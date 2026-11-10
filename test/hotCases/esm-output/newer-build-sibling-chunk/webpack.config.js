"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
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
