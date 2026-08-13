"use strict";

// `[chunkhash]` comes from the chunk's own modules and nothing repairs it after a
// fill, so a baked reference would leave an immutable name over changed bytes.

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
