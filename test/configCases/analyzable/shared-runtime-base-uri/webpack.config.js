"use strict";

// Two entries name different `baseUri` values but share one runtime chunk, so webpack
// writes a single `__webpack_require__.b` — the one a literal may spell.

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
