"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		// No floor to read from, so the hint falls back to its own default.
		splitChunks: false
	},
	performance: {
		hints: "warning",
		tinyChunks: true
	}
};
