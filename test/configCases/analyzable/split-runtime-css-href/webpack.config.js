"use strict";

// The entry chunk hashes after the runtime chunk that names its stylesheet, so its
// url cannot be baked — the lazy stylesheet's still is, and the id the map lacks
// falls back to the runtime name lookup instead of costing the whole map.

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
