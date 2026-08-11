"use strict";

// Rewriting an asset after its own content hash was taken needs `realContentHash` to
// bring the two back in line; without it no stand-in may be reserved, so a module in
// chunks at two depths keeps the runtime public path in front of a literal filename.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		realContentHash: false
	},
	output: {
		module: true,
		filename: "main.[contenthash].mjs",
		chunkFilename: "[name].mjs",
		workerChunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	experiments: { outputModule: true }
};
