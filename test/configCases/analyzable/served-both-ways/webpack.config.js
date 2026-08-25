"use strict";

// One module in an initial chunk the host fetched and in an async chunk the loader
// fetched through `output.publicPath` — two urls one public path apart. Separate entries,
// because a chunk never duplicates what a parent already carries. That only makes the two
// disagree where the public path has a depth of its own; this one has none, so the same
// literal is right whichever way the asset was served.

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
