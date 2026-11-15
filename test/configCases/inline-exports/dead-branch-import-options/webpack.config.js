"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		optimization: { inlineExports: true, minimize: false }
	},
	{
		mode: "production",
		optimization: { inlineExports: true }
	}
];
