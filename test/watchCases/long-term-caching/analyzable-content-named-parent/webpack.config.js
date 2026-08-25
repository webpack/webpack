"use strict";

// The chunk holding the reference is named by its own content, and `[chunkhash]` reads
// only its own modules — which a change to the child does not touch. Baking is sound
// here because the name being baked reaches that hash first.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		moduleIds: "named",
		splitChunks: false,
		realContentHash: false
	}
};
