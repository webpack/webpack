"use strict";

let INDEX = 0;

// A hashed chunk name is settled long after the code referencing it is generated, so
// the specifier is emitted as a stand-in and filled in once the hash exists. Whatever
// the template holds, the name baked in has to be the one on disk.
//
// Rewriting a chunk after its own hash was taken leaves that hash stale, and
// `RealContentHashPlugin` is what brings the two back in line — so without it the
// runtime form is kept instead.

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
			__ANALYZABLE__: JSON.stringify(realContentHash)
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
	// No correction for a stale name, so the runtime form is kept.
	base("g", "[name].[contenthash].mjs", false)
];
