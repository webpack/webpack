"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { filename: "[name].js", pathinfo: false },
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false } }
	},
	optimization: {
		// Reordering a list rewrites the separators between its tokens anyway, so
		// the switch that only normalizes them has nothing left to keep.
		minimize: {
			html: { normalizeListAttributes: false, sortTokenLists: true }
		},
		minimizer: ["..."]
	},
	experiments: { html: true }
};
