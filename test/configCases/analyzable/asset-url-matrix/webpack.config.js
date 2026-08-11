"use strict";

// The same asset reference, read from chunks at two depths, under every shape a public
// path comes in. Both have to name the same file — the runtime resolves a public path
// against the output root, so one that needs a base is walked back there first and one
// that reaches the same place from any base is left alone.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} dir subdirectory keeping the emitted chunks of each config apart
 * @param {NonNullable<import("../../../../").Configuration["output"]>["publicPath"]} publicPath the shape under test
 * @param {string} root what the chunk one directory down is expected to bake
 * @param {string} deep what the chunk a directory down is expected to bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, dir, publicPath, root, deep) => ({
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
			__ROOT__: JSON.stringify(root),
			__DEEP__: JSON.stringify(deep)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Chunk-relative already: the `../` path back to the root is the whole prefix.
	base(0, "a", "auto", "../asset.txt", "../../asset.txt"),
	// Relative to the output root, so it follows that same `../` path.
	base(1, "b", "", "../asset.txt", "../../asset.txt"),
	base(2, "c", "./", "../asset.txt", "../../asset.txt"),
	base(3, "d", "media/", "../media/asset.txt", "../../media/asset.txt"),
	// Rooted at the origin, or a url of its own: the same place from any base.
	base(4, "e", "/media/", "/media/asset.txt", "/media/asset.txt"),
	base(5, "f", "//cdn.test/", "//cdn.test/asset.txt", "//cdn.test/asset.txt"),
	base(
		6,
		"g",
		"https://cdn.test/",
		"https://cdn.test/asset.txt",
		"https://cdn.test/asset.txt"
	),
	// A function is called for its value, which here does not move with the hash.
	base(
		7,
		"h",
		() => "https://cdn.test/fn/",
		"https://cdn.test/fn/asset.txt",
		"https://cdn.test/fn/asset.txt"
	)
];
