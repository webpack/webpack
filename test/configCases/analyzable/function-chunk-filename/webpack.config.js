"use strict";

// A function `chunkFilename` bakes right away when its answer holds no hash, and is
// asked again by the deferred pass when it does — or falls back if nothing corrects it.

const webpack = require("../../../../");

/**
 * @param {number} index position in this array, and so the entry's emitted name
 * @param {NonNullable<import("../../../../").Configuration["output"]>["chunkFilename"]} chunkFilename filename
 * @param {boolean} analyzable whether the import is expected to bake
 * @param {boolean=} realContentHash whether a stale name gets corrected
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, chunkFilename, analyzable, realContentHash = false) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", splitChunks: false, realContentHash },
	output: { module: true, chunkFilename, publicPath: "auto" },
	plugins: [
		new webpack.DefinePlugin({
			__ANALYZABLE__: JSON.stringify(analyzable),
			__INDEX__: JSON.stringify(index)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Returns a plain template — the same answer whatever the hashes are.
	base(0, (pathData) => `a-${pathData.chunk.name}/[name].mjs`, true),
	// Returns a template carrying a hash placeholder.
	base(1, () => "b-[name].[contenthash].mjs", false),
	// The same template, deferred: the pass asks again once the hash is settled.
	base(2, () => "d-[name].[contenthash].mjs", true, true),
	// Builds the name from a hash itself, and is asked again the same way.
	base(
		3,
		(pathData) =>
			`e-[name].${
				/** @type {Record<string, string>} */ (pathData.chunk.contentHash)
					.javascript
			}.mjs`,
		true,
		true
	),
	// Builds the name from a hash itself, so nothing is left to test for.
	base(
		4,
		(pathData) =>
			`c-[name].${
				/** @type {Record<string, string>} */ (pathData.chunk.contentHash)
					.javascript
			}.mjs`,
		false
	),
	// Reads what names the asset but is not a hash — the same answer both times.
	base(5, (pathData) => `f-[name].${pathData.runtime}.mjs`, true),
	// The placeholder form of the same, resolved rather than asked for.
	base(6, "g-[name].[runtime].mjs", true)
];
