"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "contenthash with base64url digest and length",
		target: "node",
		// realContentHash rehashes in output.hashDigest, dropping an inline digest
		optimization: { realContentHash: false },
		output: {
			filename: "bundle0.[contenthash:base64url:8].js"
		}
	},
	{
		name: "fullhash with base62 digest and length",
		target: "node",
		output: {
			filename: "bundle1.[fullhash:base62:10].js"
		}
	}
];
