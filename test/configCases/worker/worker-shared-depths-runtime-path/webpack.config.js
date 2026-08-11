"use strict";

// Without `realContentHash` nothing repairs a rewritten name, so no stand-in may be
// reserved and two depths keep the runtime public path before a literal filename.

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
