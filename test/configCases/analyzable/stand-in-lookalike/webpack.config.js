"use strict";

/** @import { Configuration } from "../../../../" */

// Source of our own can spell the stand-in too, so nothing about a payload is given:
// one the deferred pass cannot read is left alone rather than replaced with a guess.

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
