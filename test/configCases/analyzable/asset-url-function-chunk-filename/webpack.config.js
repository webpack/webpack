"use strict";

// A stand-in is filled after its chunks are named: a name settled before the fill
// bakes outright, one built out of the content is repaired after — both bake.

const webpack = require("../../../../");

/**
 * @param {number} index position in this array, and so the entry's emitted name
 * @param {NonNullable<import("../../../../").Configuration["output"]>["chunkFilename"]} chunkFilename filename
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, chunkFilename) => ({
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
			__INDEX__: JSON.stringify(index)
		})
	],
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The answer holds no hash, so the name is settled before the fill rewrites it.
	base(0, (pathData) => `${pathData.chunk.name}-0.mjs`),
	// Builds the name out of the chunk's own content hash, which the fill invalidates
	// and the repair pass then brings back in line.
	base(
		1,
		(pathData) =>
			`${pathData.chunk.name}-1.${
				/** @type {Record<string, string>} */ (pathData.chunk.contentHash)
					.javascript
			}.mjs`
	)
];
