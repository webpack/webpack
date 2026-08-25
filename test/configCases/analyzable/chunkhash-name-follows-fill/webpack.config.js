"use strict";

// `[chunkhash]` reads this chunk's own modules, which a fill does not touch, so nothing
// repairs it after. It bakes because the fold reaches the hash before the name is taken.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: false, chunkIds: "named" }
};
