"use strict";

/** @import { Configuration } from "../../../../" */

// `[chunkhash]` reads a chunk's own modules, which the fill never touches. Only the
// loader names a chunk, so a pair importing each other needs no repair either.

/** @type {Configuration} */
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
