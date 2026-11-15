"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
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
