"use strict";

// `[chunkhash]` is taken from the chunk's own modules, and unlike `[contenthash]`
// nothing repairs it after a stand-in is filled in — so a baked reference would leave
// this chunk's immutable name pointing at bytes that changed under it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: true, chunkIds: "named" }
};
