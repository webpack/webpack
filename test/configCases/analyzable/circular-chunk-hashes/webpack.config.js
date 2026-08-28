"use strict";

// Two chunks naming each other both bake: `optimization.realContentHash` re-hashes
// the pair as one group, so neither name chases the other.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: true, chunkIds: "named" }
};
