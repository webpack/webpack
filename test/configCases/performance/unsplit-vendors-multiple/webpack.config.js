"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// Both entrypoints carry the same vendor module, so only the name tie-break
	// makes the report order stable.
	entry: { alpha: "./index.js", zebra: "./other.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		unsplitVendors: true
	},
	optimization: { splitChunks: false }
};
