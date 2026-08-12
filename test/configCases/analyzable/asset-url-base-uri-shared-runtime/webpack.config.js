"use strict";

// The shared chunk's runtime spans both entries, and they disagree about the base —
// so the module in it must keep the runtime form even though entry `b` alone would
// bake a base-less literal. Both answers have to reach the module hash, or one
// code-generation job serves both runtimes and the wrong one wins.

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
