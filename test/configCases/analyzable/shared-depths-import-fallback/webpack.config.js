"use strict";

// Multi-depth is answered by reserving a stand-in, which rewrites the asset after its
// own content hash was taken — so with `realContentHash` off and javascript named by
// its content, there is nothing to repair the name and the runtime form stays.

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
