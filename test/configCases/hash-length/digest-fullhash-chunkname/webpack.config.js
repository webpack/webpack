"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "fullhash digest, base64url",
		target: "node",
		// hashDigestLength smaller than the inline length, to exercise full entropy;
		// the runtime inlines the re-encoded full hash (post-hash) so the URL matches
		output: {
			hashDigestLength: 8,
			chunkFilename: "[name].[fullhash:base64url:12].js"
		}
	},
	{
		name: "fullhash digest, hex",
		target: "node",
		output: {
			chunkFilename: "[name].[fullhash:hex:12].js"
		}
	}
];
