"use strict";

// One module in a chunk the host fetched and one the loader fetched through a public
// path with depth — two urls a directory apart, so each asset gets its own literal.

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
		publicPath: "./assets/"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
