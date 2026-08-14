"use strict";

// A stand-in is filled after its chunks are named, so a content-derived name rules it
// out — a filename function is asked which it is, not assumed to be the worse one.

const webpack = require("../../../../");

/**
 * @param {number} index position in this array, and so the entry's emitted name
 * @param {NonNullable<import("../../../../").Configuration["output"]>["chunkFilename"]} chunkFilename filename
 * @param {boolean} analyzable whether the asset url is expected to bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, chunkFilename, analyzable) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", splitChunks: false },
	output: {
		module: true,
		chunkFilename,
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__ANALYZABLE__: JSON.stringify(analyzable)
		})
	],
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The answer holds no hash, so the name is settled before the fill rewrites it.
	base(0, (pathData) => `${pathData.chunk.name}-0.mjs`, true),
	// Builds the name out of the chunk's own content hash, which the fill invalidates.
	base(
		1,
		(pathData) =>
			`${pathData.chunk.name}-1.${
				/** @type {Record<string, string>} */ (pathData.chunk.contentHash)
					.javascript
			}.mjs`,
		false
	)
];
