"use strict";

// The entry chunk hashes after the runtime chunk naming its stylesheet, so its url
// is reserved with a repair mark: both bake, and nothing builds a url at runtime.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		module: true,
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		cssChunkFilename: "[name].[contenthash].css",
		publicPath: "auto"
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named",
		runtimeChunk: "single"
	}
};
