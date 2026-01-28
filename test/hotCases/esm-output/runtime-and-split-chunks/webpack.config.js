"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
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
		runtimeChunk: true,
		minimize: true,
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
