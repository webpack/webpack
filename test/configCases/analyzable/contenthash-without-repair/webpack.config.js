"use strict";

// `optimization.realContentHash` normally brings a rewritten `[contenthash]` name back
// in line with its bytes. Without it, baking is accounted for in the hash instead.

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
