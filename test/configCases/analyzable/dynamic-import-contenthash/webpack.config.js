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
		// analyzable literal can't be baked — this must fall back, not throw.
		chunkFilename: "[name].[contenthash:base64:8].mjs"
	}
};
