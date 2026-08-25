"use strict";

// `optimization.realContentHash` is what normally brings a rewritten chunk's own
// `[contenthash]` name back in line with its bytes. Without it the name is taken once
// and kept, so baking has to be accounted for in the hash instead.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: false, chunkIds: "named" }
};
