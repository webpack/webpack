"use strict";

// `output.publicPath` names a hash that does not exist while this chunk is hashed, and
// `[chunkhash]` is not repaired after — so the chunk settles in the round that follows.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	experiments: { outputModule: true },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "bundle0.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "/cdn/[fullhash]/"
	},
	optimization: { chunkIds: "named", realContentHash: false, minimize: false }
};
