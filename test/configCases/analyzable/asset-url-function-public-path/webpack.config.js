"use strict";

// A function public path is called for its value rather than read as a template, so
// it is baked only where that value does not move with the compilation hash.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {NonNullable<import("../../../../").Configuration["output"]>["publicPath"]} publicPath the public path under test
 * @param {boolean} baked whether the specifier is expected to be a literal
 * @param {boolean=} hashed whether the value it bakes carries the compilation hash
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, publicPath, baked, hashed = false) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		library: { type: "module" },
		publicPath,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__BAKED__: JSON.stringify(baked),
			__HASHED__: JSON.stringify(hashed)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, () => "https://cdn.example.com/", true),
	// The same answer whatever the hash is, so it is still bakeable.
	base(
		1,
		(pathData) => (pathData.hash ? "https://cdn.example.com/" : ""),
		true
	),
	// This one moves with a hash code generation does not have yet, so the deferred
	// pass calls it again once that hash exists.
	base(
		2,
		(pathData) => `https://cdn.example.com/${pathData.hash}/`,
		true,
		true
	),
	// Probing must never fail a build the real naming call would have completed, so
	// one that throws on the two stand-in hashes still builds and keeps its runtime.
	base(
		3,
		(pathData) => {
			if (
				/^(?:0123456789|3210fedcba)/.test(/** @type {string} */ (pathData.hash))
			) {
				throw new Error("probed");
			}
			return "https://cdn.example.com/";
		},
		false
	)
];
