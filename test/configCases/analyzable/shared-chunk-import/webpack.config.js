"use strict";

// A chunk reachable from several groups is named once in the loader's map, which
// installs it through the same `installedChunks` table either form uses.
// `one` is imported twice (two groups) and `vendor` is split out and shared by both.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor/,
					chunks: "all",
					name: "vendor",
					enforce: true
				}
			}
		}
	}
};
