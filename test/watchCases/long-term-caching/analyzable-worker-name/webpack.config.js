"use strict";

// A worker's chunk is an async entrypoint, reached by neither other walk. Its name is
// baked into the chunk spawning it, whose `[chunkhash]` must move with it.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	output: {
		module: true,
		filename: "bundle.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		moduleIds: "named",
		splitChunks: false,
		realContentHash: false
	}
};
