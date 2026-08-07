"use strict";

// A function `chunkFilename` is called for the template it returns. Only what it
// answers for this chunk is knowable during code generation, and no hash is — so a
// plain answer bakes, and one that reads a hash (by placeholder or off `pathData`)
// keeps the runtime form rather than naming a file that is never emitted.

const webpack = require("../../../../");

/**
 * @param {number} index position in this array, and so the entry's emitted name
 * @param {NonNullable<import("../../../../").Configuration["output"]>["chunkFilename"]} chunkFilename filename
 * @param {boolean} analyzable whether the import is expected to bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, chunkFilename, analyzable) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", splitChunks: false },
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
	// Builds the name from a hash itself, so nothing is left to test for.
	base(
		2,
		(pathData) =>
			`c-[name].${
				/** @type {Record<string, string>} */ (pathData.chunk.contentHash)
					.javascript
			}.mjs`,
		false
	)
];
