"use strict";

const SlashHash = require("../hash-changes-chunk-root-depth/SlashHash");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ hashDigest: "hex", publicPath: "auto" },
	{ hashDigest: "base64url", publicPath: "auto" },
	{ hashDigest: "base64", publicPath: "https://test.cases/path/" }
].map((output, index) => ({
	mode: "none",
	target: "web",
	output: {
		filename: `bundle${index}/static/js/[name].[contenthash:4].js`,
		chunkFilename: `bundle${index}/static/js/chunks/[name].js`,
		hashFunction: SlashHash,
		...output
	}
}));
