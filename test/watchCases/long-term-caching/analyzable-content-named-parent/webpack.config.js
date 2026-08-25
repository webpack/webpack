"use strict";

// `[chunkhash]` reads only this chunk's own modules, which a change to the child does
// not touch — so the name it bakes has to reach that hash first.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		moduleIds: "named",
		splitChunks: false,
		realContentHash: false
	}
};
