"use strict";

// One module fetched by the host and by the loader — separate entries, since a chunk
// never duplicates what a parent carries. A public path of no depth serves both alike.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: { bundle0: "./index.js", side: "./side.js" },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "./"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
