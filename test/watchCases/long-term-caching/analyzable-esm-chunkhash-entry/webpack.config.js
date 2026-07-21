"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		// A [chunkhash] entry name (no realContentHash): its hash must pick up the
		// referenced chunk's hash so the baked literal never goes stale across rebuilds.
		filename: "main.[chunkhash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
