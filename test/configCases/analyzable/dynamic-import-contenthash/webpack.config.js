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
		// A digest-suffixed content hash is unknown during code generation, so the
		// name is reserved and filled in once it exists. The entry the stand-in lands
		// in is not named by its own content, so the rewrite invalidates nothing.
		chunkFilename: "[name].[contenthash:base64:8].mjs"
	}
};
