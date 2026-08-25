"use strict";

// A `baseUri` naming a host but no scheme is read against the chunk's own url — the
// url the literal resolves against — so it stays protocol-relative and settles there.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: { bundle0: { import: "./index.js", baseUri: "//cdn.example/" } },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "./"
	},
	optimization: { chunkIds: "named" }
};
