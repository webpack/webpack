"use strict";

// One `[fullhash]` read at runtime next to one re-encoded by a digest: the digest is
// inlined, but the plain placeholder still calls `getFullHash`, so it must be defined.

const webpack = require("../../../../");

const MIXED = "[fullhash:8].[fullhash:base64url:8]";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "js chunk",
		target: "node",
		output: { chunkFilename: `[name].${MIXED}.js` }
	},
	{
		name: "js chunk, untruncated read",
		target: "node",
		output: {
			hashDigestLength: 8,
			chunkFilename: "[name].[fullhash].[fullhash:hex:12].js"
		}
	},
	{
		name: "js chunk, esm",
		target: "node",
		output: { module: true, chunkFilename: `[name].${MIXED}.mjs` }
	},
	{
		name: "css chunk",
		target: "web",
		output: {
			filename: "bundle3.js",
			chunkFilename: "[name].chunk3.js",
			cssChunkFilename: `[name].${MIXED}.css`
		},
		optimization: { chunkIds: "named" },
		experiments: { css: true }
	},
	...[false, true].map((module, index) => ({
		name: `public path${module ? ", esm" : ""}`,
		target: "node",
		entry: "./public-path.js",
		module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
		output: {
			module,
			assetModuleFilename: "[name][ext]",
			publicPath: "/cdn/[fullhash:8]/[fullhash:hex:12]/"
		},
		plugins: [new webpack.DefinePlugin({ __INDEX__: 4 + index })]
	}))
];
