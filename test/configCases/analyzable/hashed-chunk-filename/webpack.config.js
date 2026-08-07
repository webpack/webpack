"use strict";

// A hashed chunk name is settled long after the code referencing it is generated, so
// the specifier is emitted as a stand-in and filled in once the hash exists. Rewriting
// a chunk after its own hash was taken leaves that hash stale, and
// `RealContentHashPlugin` is what brings the two back in line — so without it the
// runtime form is kept instead.

/**
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {boolean} realContentHash whether a stale name gets corrected
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (name, realContentHash) => ({
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
	output: {
		module: true,
		chunkFilename: `${name}-[name].[contenthash].mjs`,
		publicPath: "auto"
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [base("a", true), base("b", false)];
