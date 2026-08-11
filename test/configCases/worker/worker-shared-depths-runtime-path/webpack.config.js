"use strict";

// Two depths need a stand-in, and without `realContentHash` one may only be written
// into an asset no template names by its own content. The entry is named that way and
// the chunks holding the reference are not — and they are the ones rewritten.

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
