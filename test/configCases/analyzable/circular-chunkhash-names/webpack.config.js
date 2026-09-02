"use strict";

// `[chunkhash]` reads a chunk's own modules, which the fill never touches — so a pair
// naming each other is repaired from what the fill left, and both directions bake.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].[chunkhash].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", minimize: false }
};
