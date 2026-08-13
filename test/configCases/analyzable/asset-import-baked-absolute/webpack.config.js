"use strict";

// A complete url of its own is already the whole string the concatenation built, so
// the wrapper can export it as a literal rather than reading the runtime public path.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		publicPath: "https://cdn.example.com/x/",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
};
