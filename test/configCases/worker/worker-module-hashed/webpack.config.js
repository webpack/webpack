"use strict";

/** @import { Configuration } from "../../../../" */

// The worker chunk is named by its own content, so its name is reserved and filled
// in later — into the entry, which no template names by its content.

/** @type {Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		publicPath: "auto",
		workerChunkFilename: "[name].[contenthash].mjs"
	}
};
