"use strict";

// The entry chunk hashes after the runtime chunk naming its stylesheet, so only
// the lazy url bakes and the missing id falls back to the runtime name lookup.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		module: true,
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		cssChunkFilename: "[name].[contenthash].css",
		publicPath: "auto"
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named",
		runtimeChunk: "single"
	}
};
