"use strict";

// `[chunkhash]` reads a chunk's own modules, which the fill never touches. Only the
// loader names a chunk, so a pair importing each other needs no repair either.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].[chunkhash].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", minimize: false }
};
