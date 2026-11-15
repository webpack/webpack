"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [true, false].map((usedExports) => ({
	output: {
		library: { type: "system", name: `defaults-${usedExports}` }
	},
	externals: [
		"false-value",
		"zero-value",
		"empty-value",
		"null-value",
		"undefined-value",
		"nan-value",
		"truthy-value",
		"commonjs-value"
	],
	optimization: { usedExports }
}));
