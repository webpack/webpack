"use strict";

// The entry reaches an initial chunk carrying a runtime, whose hash may never be read.
// A filename function names the lazy chunk, resolving only once the hashes exist.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].[chunkhash].mjs",
		chunkFilename: () => "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named",
		runtimeChunk: "single"
	}
};
