"use strict";

// Two entries set different `baseUri` values but share one runtime chunk, so webpack
// writes a single `__webpack_require__.b` — the first entry's. The two never disagree at
// runtime, whatever their descriptors say, so a literal may spell that one base.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: {
		bundle0: { import: "./index.js", baseUri: "https://first.example/" },
		side: { import: "./side.js", baseUri: "https://second.example/" }
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "./"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		runtimeChunk: "single"
	}
};
