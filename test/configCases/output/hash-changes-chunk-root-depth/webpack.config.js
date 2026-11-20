"use strict";

const SlashHash = require("./SlashHash");

/** @type {import("../../../../").Configuration[]} */
const variants = [
	{ target: "web", output: { publicPath: "auto" } },
	{
		target: "node",
		output: { filename: "bundle1/static/js/[name].[chunkhash:4].js" }
	},
	{
		target: "node",
		output: {
			filename: "bundle2/static/js/[name].[fullhash:4].mjs",
			module: true
		}
	},
	{
		target: "web",
		output: {
			filename: "bundle3/static/js/[name].[contenthash:base64:4].js",
			hashDigest: "hex",
			publicPath: "auto"
		}
	}
];

module.exports = variants.map((variant, index) => ({
	mode: "none",
	target: variant.target,
	output: {
		filename: `bundle${index}/static/js/[name].[contenthash:4].js`,
		chunkFilename: `bundle${index}/static/js/chunks/[name].js`,
		hashFunction: SlashHash,
		hashDigest: "base64",
		...variant.output
	}
}));
