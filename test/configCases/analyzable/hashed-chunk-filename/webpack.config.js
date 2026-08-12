"use strict";

let INDEX = 0;

// A hashed chunk name is emitted as a stand-in and filled in once the hash exists.
// What the rewrite could invalidate is the name of the chunk the stand-in lands in —
// the entry here, which no template names by its content — not the one referenced.

/**
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} chunkFilename the template under test
 * @param {boolean=} realContentHash whether a stale name gets corrected
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (name, chunkFilename, realContentHash = true) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: {
		chunkIds: "named",
		minimize: false,
		splitChunks: false,
		realContentHash
	},
	plugins: [
		new (require("../../../../").DefinePlugin)({
			__INDEX__: JSON.stringify(INDEX++),
			__ANALYZABLE__: JSON.stringify(true)
		})
	],
	output: {
		module: true,
		chunkFilename: `${name}-${chunkFilename}`,
		publicPath: "auto"
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base("a", "[name].[contenthash].mjs"),
	base("b", "[name].[chunkhash].mjs"),
	base("c", "[name].[fullhash].mjs"),
	base("d", "[name].[contenthash:8].mjs"),
	// `[runtime]` is only filled in when the runtime is handed to the path as well.
	base("e", "[name].[runtime].[contenthash].mjs"),
	base("f", "nested/dir/[name].[contenthash].mjs"),
	// The referenced chunk is named by its content and nothing repairs a stale name,
	// but the entry the stand-in is written into is not, so there is none to repair.
	base("g", "[name].[contenthash].mjs", false)
];
