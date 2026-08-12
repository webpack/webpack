"use strict";

// Source of our own can spell the stand-in too, so nothing about a payload is given:
// one the deferred pass cannot read is left alone rather than replaced with a guess.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
