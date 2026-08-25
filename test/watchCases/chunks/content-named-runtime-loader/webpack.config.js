"use strict";

// The runtime chunk carries no module of its own, so only its runtime modules can move
// its content hash — and the loader one has to grow a chunk loader at the second step.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	experiments: {
		outputModule: true
	},
	optimization: {
		chunkIds: "named",
		moduleIds: "named",
		runtimeChunk: "single"
	},
	output: {
		module: true,
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
