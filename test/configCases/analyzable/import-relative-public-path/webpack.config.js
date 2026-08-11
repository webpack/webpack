"use strict";

// The runtime imports a chunk from the chunk holding the runtime — the output root —
// so a relative public path only bakes behind the `../` path back to that root.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} dir subdirectory keeping the emitted chunks of each config apart
 * @param {string} publicPath the public path under test
 * @param {string} specifier what the chunk below the root is expected to bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, dir, publicPath, specifier) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: `${dir}/[name].mjs`,
		publicPath
	},
	optimization: { chunkIds: "named", splitChunks: false },
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__DIR__: JSON.stringify(dir),
			__SPECIFIER__: JSON.stringify(specifier)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "a", "./", "../../a/lazy.mjs"),
	// An empty one names the output root just the same.
	base(1, "b", "", "../../b/lazy.mjs")
];
