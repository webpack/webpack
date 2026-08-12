"use strict";

// A stand-in may only be written into an asset not named by its own content. Here the
// entry is, and the chunks holding the reference — the ones rewritten — are not.

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
