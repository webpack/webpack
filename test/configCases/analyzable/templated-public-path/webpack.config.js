"use strict";

// A public path carrying `[fullhash]` is settled no earlier than the hash it reads,
// so the specifier reserves a stand-in the deferred pass fills in.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} baked whether the specifier is expected to be a literal
 * @param {string=} chunkSuffix what follows the chunk's name in its filename
 * @param {boolean=} realContentHash whether the deferred pass may run at all
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (
	index,
	name,
	hashPart,
	baked,
	chunkSuffix = "",
	realContentHash = true
) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", realContentHash },
	output: {
		module: true,
		publicPath: `https://cdn.example.com/${hashPart}/`,
		chunkFilename: `${name}-[name]${chunkSuffix}.mjs`
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__BAKED__: JSON.stringify(baked),
			__SLICE__: JSON.stringify(hashPart.includes(":8") ? 8 : 0)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "plain", "[fullhash]", true),
	base(1, "sliced", "[fullhash:8]", true),
	// Both halves of the name are deferred: the public path's hash and the chunk's own.
	base(2, "hashed-chunk", "[fullhash]", true, ".[contenthash]"),
	// A digest re-encodes the hash rather than reading it, which a stand-in cannot
	// survive, so the whole specifier stays on the runtime form.
	base(3, "digest", "[fullhash:base64]", false),
	// Substituting rewrites the chunk after its own content hash was taken, and
	// `RealContentHashPlugin` is what brings the two back in line.
	base(4, "no-repair", "[fullhash]", false, "", false)
];
