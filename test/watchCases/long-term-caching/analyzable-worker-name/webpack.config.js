"use strict";

// A worker's chunk is an async entrypoint, which neither the referenced-chunk walk nor
// the initial-chunk one reaches. Its name is baked into the chunk spawning it, so that
// chunk's own `[chunkhash]` — taken from its modules, which a change to the worker does
// not touch — has to move with it.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	experiments: { outputModule: true },
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
