"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		filename: "[name].js",
		// A content-hashed chunk name makes the filename runtime module hash-dependent,
		// which must not stop the single handler from being called directly.
		chunkFilename: "[name].[contenthash].js"
	},
	optimization: { runtimeChunk: "single", chunkIds: "named" }
};
