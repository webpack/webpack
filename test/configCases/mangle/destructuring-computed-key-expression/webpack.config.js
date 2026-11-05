"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		optimization: {
			mangleExports: "size",
			concatenateModules: false,
			minimize: false
		}
	},
	{
		mode: "production",
		optimization: { mangleExports: "size" }
	}
];
