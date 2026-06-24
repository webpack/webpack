"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "contenthash digest, realContentHash off",
		target: "node",
		optimization: { realContentHash: false },
		// hashDigestLength smaller than the inline length, to exercise full-entropy
		output: {
			hashDigestLength: 8,
			chunkFilename: "[name].[contenthash:base64url:12].js"
		}
	},
	{
		name: "contenthash digest, realContentHash on",
		target: "node",
		optimization: { realContentHash: true },
		output: {
			chunkFilename: "[name].[contenthash:base64url:10].js"
		}
	},
	{
		name: "chunkhash digest",
		target: "node",
		optimization: { realContentHash: false },
		output: {
			chunkFilename: "[name].[chunkhash:base58:10].js"
		}
	}
];
