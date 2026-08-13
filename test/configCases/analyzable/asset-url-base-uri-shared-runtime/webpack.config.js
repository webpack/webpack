"use strict";

// The shared chunk's runtime spans entries that disagree about the base, so both
// answers must reach the module hash or one code-generation job serves both.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		bundle0: { import: "./index.js", baseUri: "https://example.com/base/" },
		other: { import: "./other.js" }
	},
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		publicPath: "",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	optimization: { minimize: false }
};
