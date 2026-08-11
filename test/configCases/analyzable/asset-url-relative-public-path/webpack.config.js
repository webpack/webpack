"use strict";

// The runtime resolves a public path against the output root, not against the chunk
// the reference sits in, so a relative one only bakes behind that chunk's `../` path.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} dir subdirectory keeping the emitted chunks of each config apart
 * @param {string} publicPath the public path under test
 * @param {string} flat what the root-level chunk is expected to bake
 * @param {string} deep what the nested chunk is expected to bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, dir, publicPath, flat, deep) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: `${dir}/[name].mjs`,
		publicPath,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__DIR__: JSON.stringify(dir),
			__FLAT__: JSON.stringify(flat),
			__DEEP__: JSON.stringify(deep)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "a", "./", "../asset.txt", "../../asset.txt"),
	// An empty one names the output root just the same.
	base(1, "b", "", "../asset.txt", "../../asset.txt")
];
