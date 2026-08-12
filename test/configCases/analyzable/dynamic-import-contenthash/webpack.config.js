"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		publicPath: "auto",
		// The name is reserved and filled in once the hash exists; the entry it lands
		// in is not named by its own content, so the rewrite invalidates nothing.
		chunkFilename: "[name].[contenthash:base64:8].mjs"
	}
};
