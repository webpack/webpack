"use strict";

// Reserving a stand-in rewrites the asset after its content hash was taken, so with
// `realContentHash` off and javascript named by content nothing repairs it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "main.[contenthash].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		realContentHash: false
	}
};
