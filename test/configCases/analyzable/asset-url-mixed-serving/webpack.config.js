"use strict";

// A public path needing a base is spelled from a chunk the host loads and left out of
// one webpack loads through it. A module in both has no one answer, so it falls back.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: { bundle0: "./index.js", lazy: "./lazy-entry.js" },
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "c/[name].mjs",
		publicPath: "media/",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
