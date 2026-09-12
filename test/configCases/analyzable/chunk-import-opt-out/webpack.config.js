"use strict";

// `output.analyzableChunkImport: false` keeps the hashed chunk filename in the
// runtime chunk's map alone, so the entry importing it does not carry its hash.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		analyzableChunkImport: false,
		filename: "[name].[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named",
		runtimeChunk: "single"
	}
};
