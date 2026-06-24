"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "function chunkFilename, chunkhash digest",
		target: "node",
		optimization: { realContentHash: false },
		output: {
			// a function chunkFilename routes chunks through the static-URL path in
			// GetChunkFilenameRuntimeModule, exercising its inline-digest handlers
			chunkFilename: () => "[name].[chunkhash:base64url:8].js"
		}
	},
	{
		name: "function chunkFilename, contenthash digest",
		target: "node",
		optimization: { realContentHash: false },
		output: {
			chunkFilename: () => "[name].[contenthash:base64url:8].js"
		}
	}
];
