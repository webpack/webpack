"use strict";

// The runtime lives in its own chunk, so the entry holding the reference reaches an
// initial chunk with a runtime — one whose hash is remixed with the compilation hash
// and so may never be read. A filename function names the lazy chunk, which resolves
// to a name only once the hashes exist.

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
