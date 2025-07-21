"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				common: {
					test: /common/,
					name: "common",
					priority: 10,
					enforce: true
				},
				vendor: {
					test: /node_modules/,
					name: "vendor",
					priority: 20
				}
			}
		}
	}
};
